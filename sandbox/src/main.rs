use axum::{
    Json, Router,
    body::{Body, Bytes},
    extract::{DefaultBodyLimit, Path, State},
    http::{HeaderMap, StatusCode, header},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    collections::HashMap,
    path::PathBuf,
    sync::Arc,
    time::{Duration, Instant},
};
use subtle::ConstantTimeEq;
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::UnixStream,
    process::Command,
    sync::{Mutex, Semaphore},
    time::{sleep, timeout},
};
use uuid::Uuid;

const MAX_SESSIONS: usize = 6;
const IDLE: Duration = Duration::from_secs(90);
const LIFETIME: Duration = Duration::from_secs(12 * 60);
const LABEL: &str = "io.phishout.sandbox=1";
type Failure = (StatusCode, &'static str);

#[derive(Clone)]
struct Pool {
    secret: Arc<str>,
    root: PathBuf,
    slots: Arc<Mutex<HashMap<Uuid, Arc<Slot>>>>,
}

struct Slot {
    owner: String,
    slug: String,
    created: Instant,
    last_seen: Mutex<Instant>,
    browser: Mutex<bool>,
    stream: Arc<Semaphore>,
}

#[derive(Deserialize)]
struct Launch {
    id: Uuid,
    slug: String,
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum Input {
    Move {
        x: u16,
        y: u16,
    },
    Click {
        x: u16,
        y: u16,
    },
    Wheel {
        x: u16,
        y: u16,
        delta: i16,
    },
    Key {
        key: String,
        #[serde(default)]
        ctrl: bool,
        #[serde(default)]
        alt: bool,
        #[serde(default)]
        shift: bool,
    },
}

fn address(slug: &str) -> Option<&'static str> {
    Some(match slug {
        "inbox-trap" => "mail.novabyte.example:8080/inbox",
        "link-inspector" => "news.dailybyte.example:8080/offers",
        "spot-the-lookalike" => "n0vabyte.example:8080/login",
        "double-trouble" => "accounts.novabyte.example:8080/signin",
        "tick-tock" => "secure-alerts.example:8080/verify",
        "download-roulette" => "files.quickshare.example:8080/invoice",
        "whos-the-boss" => "chat.novabyte.example:8080/dm",
        "popup-panic" => "free-movies.example:8080/watch",
        "crush-switch" => "fakestagram.example:8080/direct/inbox",
        _ => return None,
    })
}

async fn guard(State(pool): State<Pool>, request: axum::extract::Request, next: Next) -> Response {
    let key = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "));
    if !key.is_some_and(|key| bool::from(key.as_bytes().ct_eq(pool.secret.as_bytes()))) {
        return StatusCode::UNAUTHORIZED.into_response();
    }
    next.run(request).await
}

fn owner(headers: &HeaderMap) -> Result<&str, Failure> {
    headers
        .get("x-sandbox-owner")
        .and_then(|value| value.to_str().ok())
        .filter(|value| !value.is_empty() && value.len() <= 128)
        .ok_or((StatusCode::BAD_REQUEST, "missing owner"))
}

fn name(id: Uuid) -> String {
    format!("phish-out-{id}")
}

async fn docker(args: &[&str]) -> std::io::Result<std::process::Output> {
    timeout(
        Duration::from_secs(15),
        Command::new("docker")
            .args(args)
            .kill_on_drop(true)
            .output(),
    )
    .await
    .map_err(|_| std::io::Error::new(std::io::ErrorKind::TimedOut, "Docker command"))?
}

async fn remove(pool: &Pool, id: Uuid, slot: &Arc<Slot>) {
    let mut browser = slot.browser.lock().await;
    if !pool
        .slots
        .lock()
        .await
        .get(&id)
        .is_some_and(|current| Arc::ptr_eq(current, slot))
    {
        return;
    }
    *browser = false;
    let container = name(id);
    let removed = docker(&["rm", "-f", &container]).await.is_ok_and(|output| {
        output.status.success()
            || String::from_utf8_lossy(&output.stderr).contains("No such container")
    });
    if removed {
        let _ = tokio::fs::remove_dir_all(pool.root.join(id.to_string())).await;
        let mut slots = pool.slots.lock().await;
        if slots
            .get(&id)
            .is_some_and(|current| Arc::ptr_eq(current, slot))
        {
            slots.remove(&id);
        }
    } else {
        eprintln!("Could not remove {container}; keeping slot reserved for cleanup retry");
    }
}

async fn setup(pool: &Pool, id: Uuid, slot: &Slot, address: &str) -> Result<(), Failure> {
    let mut live = slot.browser.lock().await;
    let directory = pool.root.join(id.to_string());
    let boot_error = (StatusCode::SERVICE_UNAVAILABLE, "sandbox failed to start");
    tokio::fs::create_dir(&directory)
        .await
        .map_err(|_| boot_error)?;
    let bridge = format!("type=bind,src={},dst=/bridge", directory.display());
    let container = name(id);
    let run = docker(&[
        "run",
        "--detach",
        "--init",
        "--name",
        &container,
        "--label",
        LABEL,
        "--network",
        "none",
        "--cap-drop",
        "ALL",
        "--security-opt",
        "no-new-privileges",
        "--read-only",
        "--tmpfs",
        "/tmp:rw,nosuid,nodev,size=384m,mode=1777",
        "--memory",
        "1024m",
        "--memory-swap",
        "1024m",
        "--cpus",
        "1.25",
        "--pids-limit",
        "256",
        "--log-opt",
        "max-size=2m",
        "--log-opt",
        "max-file=1",
        "--mount",
        &bridge,
        "phish-out-browser:local",
        &slot.slug,
        address,
    ])
    .await
    .map_err(|_| boot_error)?;
    if !run.status.success() {
        eprintln!(
            "Launch {container}: {}",
            String::from_utf8_lossy(&run.stderr)
        );
        return Err(boot_error);
    }

    let deadline = Instant::now() + Duration::from_secs(15);
    while !directory.join("ready").exists() {
        if Instant::now() >= deadline {
            eprintln!("Start {container}: native Chromium window did not appear");
            return Err(boot_error);
        }
        sleep(Duration::from_millis(200)).await;
    }
    *live = true;
    Ok(())
}

async fn launch(
    State(pool): State<Pool>,
    headers: HeaderMap,
    Json(body): Json<Launch>,
) -> Result<StatusCode, Failure> {
    let owner = owner(&headers)?;
    let address = address(&body.slug).ok_or((StatusCode::BAD_REQUEST, "unknown mission"))?;
    let now = Instant::now();
    let slot = {
        let mut slots = pool.slots.lock().await;
        if let Some(existing) = slots.get(&body.id) {
            if existing.owner != owner || existing.slug != body.slug {
                return Err((StatusCode::CONFLICT, "attempt already exists"));
            }
            let existing = existing.clone();
            drop(slots);
            return if *existing.browser.lock().await {
                Ok(StatusCode::OK)
            } else {
                Err((StatusCode::CONFLICT, "attempt is starting or closed"))
            };
        }
        if slots.values().any(|slot| slot.owner == owner) {
            return Err((StatusCode::CONFLICT, "close your existing sandbox first"));
        }
        if slots.len() >= MAX_SESSIONS {
            return Err((StatusCode::TOO_MANY_REQUESTS, "all six browsers are busy"));
        }
        let slot = Arc::new(Slot {
            owner: owner.to_owned(),
            slug: body.slug,
            created: now,
            last_seen: Mutex::new(now),
            browser: Mutex::new(false),
            stream: Arc::new(Semaphore::new(1)),
        });
        slots.insert(body.id, slot.clone());
        slot
    };

    tokio::spawn(async move {
        match setup(&pool, body.id, &slot, address).await {
            Ok(()) => Ok(StatusCode::CREATED),
            Err(error) => {
                remove(&pool, body.id, &slot).await;
                Err(error)
            }
        }
    })
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "allocator stopped"))?
}

async fn owned(pool: &Pool, headers: &HeaderMap, id: Uuid) -> Result<Arc<Slot>, Failure> {
    let owner = owner(headers)?;
    pool.slots
        .lock()
        .await
        .get(&id)
        .filter(|slot| slot.owner == owner)
        .cloned()
        .ok_or((StatusCode::NOT_FOUND, "sandbox ended"))
}

async fn video(
    State(pool): State<Pool>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Result<Response, Failure> {
    let slot = owned(&pool, &headers, id).await?;
    if !*slot.browser.lock().await {
        return Err((StatusCode::NOT_FOUND, "sandbox ended"));
    }
    let permit = slot
        .stream
        .clone()
        .try_acquire_owned()
        .map_err(|_| (StatusCode::CONFLICT, "stream already open"))?;
    let socket = UnixStream::connect(pool.root.join(id.to_string()).join("video.sock"))
        .await
        .map_err(|_| (StatusCode::BAD_GATEWAY, "video encoder unavailable"))?;
    let bytes = futures_util::stream::unfold(
        (socket, slot, permit),
        |(mut socket, slot, permit)| async move {
            let mut buffer = vec![0; 32 * 1024];
            match timeout(Duration::from_secs(8), socket.read(&mut buffer)).await {
                Ok(Ok(0)) | Err(_) => None,
                Ok(Ok(length)) => {
                    buffer.truncate(length);
                    *slot.last_seen.lock().await = Instant::now();
                    Some((
                        Ok::<_, std::io::Error>(Bytes::from(buffer)),
                        (socket, slot, permit),
                    ))
                }
                Ok(Err(error)) => Some((Err(error), (socket, slot, permit))),
            }
        },
    );
    Ok((
        [
            (header::CONTENT_TYPE, "video/mp4"),
            (header::CACHE_CONTROL, "no-store"),
            (header::HeaderName::from_static("x-accel-buffering"), "no"),
        ],
        Body::from_stream(bytes),
    )
        .into_response())
}

async fn input(
    State(pool): State<Pool>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(event): Json<Input>,
) -> Result<Json<Value>, Failure> {
    let slot = owned(&pool, &headers, id).await?;
    if !*slot.browser.lock().await {
        return Err((StatusCode::NOT_FOUND, "sandbox ended"));
    }
    let event = match event {
        Input::Move { x, y } => Input::Move {
            x: x.min(1279),
            y: y.min(719),
        },
        Input::Click { x, y } => Input::Click {
            x: x.min(1279),
            y: y.min(719),
        },
        Input::Wheel { x, y, delta } => Input::Wheel {
            x: x.min(1279),
            y: y.min(719),
            delta: delta.clamp(-720, 720),
        },
        Input::Key { ref key, .. } if key.len() > 16 => {
            return Err((StatusCode::BAD_REQUEST, "unsupported key"));
        }
        other => other,
    };
    let tracks_result = matches!(event, Input::Click { .. } | Input::Key { .. });
    let wire_error = (StatusCode::BAD_GATEWAY, "sandbox input unavailable");
    let mut input = serde_json::to_vec(&event).map_err(|_| wire_error)?;
    input.push(b'\n');
    let path = pool.root.join(id.to_string()).join("input.sock");
    let accepted = timeout(Duration::from_secs(4), async {
        let mut socket = UnixStream::connect(path).await?;
        socket.write_all(&input).await?;
        let mut reply = [0; 3];
        socket.read_exact(&mut reply).await?;
        Ok::<_, std::io::Error>(reply == *b"ok\n")
    })
    .await
    .map_err(|_| wire_error)?
    .map_err(|_| wire_error)?;
    if !accepted {
        return Err((StatusCode::BAD_REQUEST, "unsupported input"));
    }
    *slot.last_seen.lock().await = Instant::now();
    if !tracks_result {
        return Ok(Json(Value::Null));
    }

    // Let the native event reach the fixture before reading its score.
    sleep(Duration::from_millis(40)).await;
    Ok(Json(mission_status(&pool, id).await))
}

async fn mission_status(pool: &Pool, id: Uuid) -> Value {
    let path = pool.root.join(id.to_string()).join("mission.sock");
    timeout(Duration::from_secs(2), async {
        let socket = UnixStream::connect(path).await.ok()?;
        let mut result = Vec::new();
        socket.take(1024).read_to_end(&mut result).await.ok()?;
        serde_json::from_slice(&result).ok()
    })
    .await
    .ok()
    .flatten()
    .unwrap_or(Value::Null)
}

/// Capacity and running missions for the admin/status page. No owner IDs are returned.
async fn status(State(pool): State<Pool>) -> Json<Value> {
    let slots = pool.slots.lock().await;
    let mut sessions = Vec::with_capacity(slots.len());
    for slot in slots.values() {
        let ready = *slot.browser.lock().await;
        let idle = slot.last_seen.lock().await.elapsed().as_secs();
        sessions.push(serde_json::json!({
            "slug": slot.slug,
            "ageSeconds": slot.created.elapsed().as_secs(),
            "idleSeconds": idle,
            "ready": ready,
        }));
    }
    Json(serde_json::json!({
        "max": MAX_SESSIONS,
        "active": slots.len(),
        "idleLimitSeconds": IDLE.as_secs(),
        "lifetimeSeconds": LIFETIME.as_secs(),
        "sessions": sessions,
    }))
}

async fn close(
    State(pool): State<Pool>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Result<Json<Value>, Failure> {
    let slot = owned(&pool, &headers, id).await?;
    let result = mission_status(&pool, id).await;
    tokio::spawn(async move {
        remove(&pool, id, &slot).await;
    });
    Ok(Json(result))
}

async fn reaper(pool: Pool) {
    loop {
        sleep(Duration::from_secs(5)).await;
        let slots = pool.slots.lock().await.clone();
        for (id, slot) in slots {
            if slot.created.elapsed() >= LIFETIME || slot.last_seen.lock().await.elapsed() >= IDLE {
                remove(&pool, id, &slot).await;
            }
        }
    }
}

#[tokio::main]
async fn main() {
    let secret = std::env::var("SANDBOX_SECRET").expect("SANDBOX_SECRET");
    assert!(
        secret.len() >= 32,
        "SANDBOX_SECRET must have at least 32 characters"
    );
    let root = PathBuf::from(std::env::var("SANDBOX_BRIDGE_DIR").expect("SANDBOX_BRIDGE_DIR"));
    tokio::fs::create_dir_all(&root)
        .await
        .expect("create sandbox bridge directory");
    let stale = docker(&["ps", "-aq", "--filter", &format!("label={LABEL}")])
        .await
        .expect("list browser containers");
    assert!(stale.status.success(), "Docker access required");
    for container in String::from_utf8_lossy(&stale.stdout).lines() {
        assert!(
            docker(&["rm", "-f", container])
                .await
                .expect("remove abandoned container")
                .status
                .success()
        );
    }
    let mut paths = tokio::fs::read_dir(&root)
        .await
        .expect("read sandbox bridge directory");
    while let Some(entry) = paths.next_entry().await.expect("read sandbox bridge entry") {
        if Uuid::parse_str(&entry.file_name().to_string_lossy()).is_ok() {
            tokio::fs::remove_dir_all(entry.path())
                .await
                .expect("remove stale bridge directory");
        }
    }
    let pool = Pool {
        secret: secret.into(),
        root,
        slots: Arc::new(Mutex::new(HashMap::new())),
    };
    tokio::spawn(reaper(pool.clone()));
    let api = Router::new()
        .route("/status", get(status))
        .route("/sessions", post(launch))
        .route("/sessions/{id}", get(video).post(input).delete(close))
        .layer(DefaultBodyLimit::max(4096))
        .layer(middleware::from_fn_with_state(pool.clone(), guard))
        .with_state(pool);
    let app = Router::new()
        .route("/health", get(|| async { "ok" }))
        .merge(api);
    let listener = tokio::net::TcpListener::bind("127.0.0.1:8787")
        .await
        .expect("bind controller");
    axum::serve(listener, app).await.expect("serve controller");
}
