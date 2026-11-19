#!/bin/sh
set -eu
export HOME=/tmp DISPLAY=:99 PHISH_MISSION="$1" PHISH_ADDRESS="$2"
Xvfb :99 -screen 0 1280x720x24 -nolisten tcp &
for attempt in $(seq 1 50); do
  if xdotool getmouselocation >/dev/null 2>&1; then break; fi
  sleep 0.1
done
xdotool getmouselocation >/dev/null
openbox >/dev/null 2>&1 &
python3 /fixture/input.py &
python3 /fixture/serve.py &
python3 -c 'import time, socket
for attempt in range(50):
    try:
        with socket.create_connection(("127.0.0.1", 8080), timeout=0.2):
            break
    except OSError:
        time.sleep(0.1)
else:
    raise SystemExit("fixture HTTP server failed")'

socat UNIX-LISTEN:/bridge/video.sock,fork,mode=0600 EXEC:"/bin/sh /fixture/video.sh" &
set -- "http://$2"
if [ "$PHISH_MISSION" = "crush-switch" ]; then
  set -- --disable-extensions-except=/fixture/fakesta-extension --load-extension=/fixture/fakesta-extension "$@"
else
  set -- --disable-extensions "$@"
fi
chromium --no-sandbox --disable-dev-shm-usage \
  --disable-gpu --renderer-process-limit=2 --test-type --disable-background-networking --disable-component-update --disable-sync \
  --no-first-run --no-default-browser-check --no-proxy-server \
  --start-maximized --window-position=0,0 --window-size=1280,720 --user-data-dir=/tmp/profile \
  --host-resolver-rules='MAP *.example 127.0.0.1, EXCLUDE localhost' \
  "$@" &
browser_pid=$!
for attempt in $(seq 1 50); do
  if xdotool search --onlyvisible --class chromium >/dev/null 2>&1; then
    touch /bridge/ready
    break
  fi
  sleep 0.2
done
wait "$browser_pid"
