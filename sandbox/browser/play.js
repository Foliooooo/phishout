(() => {
  const el = id => document.getElementById(id);
  let state;
  let busy = false;
  let opened = false;
  let timer;
  const assignments = {
    "inbox-trap": ["Find the calendar ticket you opened this morning.", "Calendar ticket received", "Keep ticket for follow-up"],
    "link-inspector": ["Build a weekend reading list. Find the feature about the community studio.", "Inside the community print studio", "Add feature to reading list"],
    "spot-the-lookalike": ["Prepare for your trip. Locate the itinerary in your workspace.", "Travel calendar", "Pin itinerary"],
    "double-trouble": ["You are joining the website team. Find its current project.", "Website refresh", "Join project"],
    "tick-tock": ["Recover your working notes before resuming the upload.", "Project notes", "Restore draft"],
    "download-roulette": ["Reconcile December’s bill. Locate the original invoice.", "December invoice.pdf", "Add invoice to reconciliation"],
    "whos-the-boss": ["Cover the afternoon shift. Find the conversation with the dispatch team.", "Dispatch desk", "Follow dispatch thread"],
    "popup-panic": ["Queue the city documentary for tonight.", "City after dark", "Add to watchlist"],
  };

  async function progress(event) {
    const response = await fetch("/progress", event ? {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...event, stage: state.step }),
    } : { cache: "no-store" });
    if (!response.ok) throw new Error("Could not save progress");
    return response.json();
  }

  function node(tag, text) {
    const element = document.createElement(tag);
    element.textContent = text;
    return element;
  }

  function renderSite(site) {
    document.title = site.name;
    el("surface").textContent = site.name;
    el("site").dataset.kind = site.kind;
    el("site-section").textContent = site.section;
    el("site-account").textContent = site.account;
    el("site-task").textContent = state.site ? site.task : "Return to open item";
    el("site-intro").textContent = site.intro;
    const [assignment, target, verb] = assignments[state.slug];
    const preparing = Boolean(state.site && !sessionStorage.getItem("prepared"));
    if (preparing) {
      el("site-intro").textContent = assignment;
      el("site-task").hidden = true;
    } else el("site-task").hidden = false;
    const rows = el("site-rows");
    const pinned = new Set(JSON.parse(sessionStorage.getItem("saved-records") || "[]"));
    let onlySaved = false;
    el("saved-view").onclick = () => {
      onlySaved = !onlySaved;
      el("saved-view").setAttribute("aria-pressed", String(onlySaved));
      showRows();
    };
    function showRows() {
      const query = el("site-search").value.trim().toLowerCase();
      const matching = site.rows.filter(row => (!onlySaved || pinned.has(row[1])) && row.slice(0, 3).some(value => value.toLowerCase().includes(query)));
      rows.replaceChildren(...matching.map(([from, title, meta, content]) => {
        const button = node("button", "");
        button.className = "site-row";
        button.setAttribute("aria-pressed", "false");
        button.append(node("span", from), node("strong", title), node("span", meta));
        const index = site.rows.findIndex(row => row[1] === title);
        if (["news", "media", "workspace"].includes(site.kind)) {
          const covers = site.kind === "media" ? ["city", "coffee", "routes"] : ["city", "studio", "routes"];
          const cover = document.createElement("img");
          cover.src = "/artwork/" + covers[index % covers.length] + ".jpg";
          cover.alt = "";
          button.prepend(cover);
        } else {
          const badge = node("b", site.kind === "storage" ? (title.split(".")[1] || "FILE").toUpperCase() : from.split(" ").map(word => word[0]).join("").slice(0, 2));
          badge.className = "record-icon tone-" + index;
          button.prepend(badge);
        }
        button.onclick = () => {
          for (const row of rows.querySelectorAll("button")) row.setAttribute("aria-pressed", String(row === button));
          el("site-detail-title").textContent = title;
          el("site-detail-body").textContent = content;
          const save = el("save-record");
          const prepare = el("prepare-record");
          prepare.hidden = !preparing || title !== target;
          prepare.textContent = verb;
          prepare.onclick = () => {
            sessionStorage.setItem("prepared", "1");
            pinned.add(title);
            sessionStorage.setItem("saved-records", JSON.stringify([...pinned]));
            void update({ kind: "start" });
          };
          save.textContent = pinned.has(title) ? "Remove from saved" : "Save for reference";
          save.onclick = () => {
            if (pinned.has(title)) pinned.delete(title); else pinned.add(title);
            sessionStorage.setItem("saved-records", JSON.stringify([...pinned]));
            save.textContent = pinned.has(title) ? "Remove from saved" : "Save for reference";
            if (onlySaved) showRows();
          };
          el("site-detail").hidden = false;
        };
        return button;
      }));
      if (!matching.length) rows.append(node("p", onlySaved ? "Open a record and save it here for reference." : "No results"));
      el("site-detail").hidden = true;
    }
    el("site-search").oninput = showRows;
    showRows();
  }

  function localUrl(address) {
    const url = new URL(`http://${address}`);
    url.port = "8080";
    return url;
  }

  function render() {
    const scene = state.scene;
    const bookmark = localUrl(state.home.address);
    bookmark.searchParams.set("workspace", "1");
    const reviewingHome = !state.site && location.href === bookmark.href;
    const site = state.site || (reviewingHome ? state.home : null);
    const address = site?.address || scene?.address;
    if (address && !reviewingHome) {
      const destination = localUrl(address);
      if (location.href !== destination.href) {
        location.assign(destination.href);
        return;
      }
    }
    document.body.dataset.mission = state.slug;
    el("site").hidden = !site;
    el("site-bookmark").href = bookmark.href;
    el("site-bookmark").hidden = Boolean(site || !scene);
    if (site) {
      renderSite(site);
      return;
    }
    el("scene").hidden = !scene;
    el("outcome").hidden = Boolean(scene);
    el("review").hidden = Boolean(scene);
    el("continue").hidden = true;
    if (!scene) {
      el("coaching").replaceChildren();
      el("outcome-title").textContent = `Mission complete · ${state.xp} XP`;
      el("consequence").textContent = "Decisions earn up to 75 XP. Inspecting evidence can earn another 25 XP.";
      el("review").replaceChildren(...state.review.map(result => {
        const row = document.createElement("li");
        const title = node("strong", `${result.subject} · ${result.points} XP`);
        const breakdown = node("p", `${result.action} · ${result.decisionPoints} decision XP · ${result.evidencePoints} evidence XP`);
        const explanation = node("p", result.lesson);
        const clues = node("ul", "");
        clues.className = "review-clues";
        for (const clue of result.clues) {
          const status = clue.explanation
            ? (clue.tagged ? "Found" : "Missed")
            : (clue.tagged ? "False flag" : "Ordinary detail");
          clues.append(node("li", `${status} · ${clue.field}. ${clue.explanation || clue.value}`));
        }
        row.append(title, breakdown, explanation, clues);
        return row;
      }));
      el("outcome-title").focus();
      return;
    }

    const needsOpen = scene.entry && !opened && !scene.evidence;
    document.title = scene.surface;
    el("surface").textContent = scene.surface;
    el("sender").textContent = scene.sender;
    el("subject").textContent = needsOpen && state.slug === "popup-panic" ? scene.surface : scene.subject;
    el("message").textContent = scene.message;
    el("message").hidden = Boolean(needsOpen);
    el("controls").hidden = Boolean(needsOpen);
    el("enter").textContent = scene.entry;
    el("enter").hidden = !needsOpen;
    el("inspect").textContent = scene.check;
    el("guide").textContent = scene.evidence
      ? "Select each detail you would flag, then choose what to do. If everything checks out, leave the details unmarked."
      : "Inspect the evidence or open the saved site to check the story before you act.";
    el("inspect").disabled = Boolean(scene.evidence);
    el("evidence").textContent = scene.evidence;
    el("evidence").hidden = !scene.evidence;
    el("clues").hidden = !scene.clues;
    el("clues").replaceChildren(...(scene.clues || []).map((clue, action) => {
      const button = node("button", "");
      button.className = "clue";
      button.setAttribute("aria-pressed", String(clue.tagged));
      button.append(node("strong", clue.field), node("span", clue.value));
      button.onclick = () => void update({ kind: "tag", action, tagged: !clue.tagged });
      return button;
    }));
    el("actions").replaceChildren(...scene.actions.map((label, action) => {
      const button = document.createElement("button");
      button.textContent = label;
      button.onclick = () => void update({ kind: "act", action });
      return button;
    }));

    const showTimer = state.slug === "tick-tock" && state.step === 0;
    el("timer").hidden = !showTimer;
    if (showTimer && !timer) {
      const end = Date.now() + 120_000;
      const tick = () => {
        const seconds = Math.max(0, Math.ceil((end - Date.now()) / 1000));
        el("timer").textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
      };
      tick();
      timer = setInterval(tick, 250);
    }
  }

  async function update(event) {
    if (busy) return;
    busy = true;
    const stage = state.step;
    const controls = [...el("controls").querySelectorAll("button:not(:disabled)"), el("site-task")];
    controls.forEach(button => { button.disabled = true; });
    try {
      state = await progress(event);
      el("error").textContent = "";
      if (state.step > stage) {
        opened = false;
        el("scene").hidden = true;
        el("outcome").hidden = false;
        el("review").hidden = true;
        const feedback = state.feedback;
        el("outcome-title").textContent = feedback.correct ? "Good call" : "What gave it away?";
        const missed = feedback.clues.find(clue => clue.explanation && !clue.tagged);
        const falseFlag = feedback.clues.find(clue => !clue.explanation && clue.tagged);
        const recall = node("details", "");
        recall.append(node("summary", "What would you check next time? Reveal the lesson"), node("p", feedback.lesson));
        el("coaching").replaceChildren(node("p", feedback.action + " · " + feedback.points + " XP"), recall);
        if (missed) recall.append(node("p", "Missed clue · " + missed.field + " · " + missed.value + ". " + missed.explanation));
        if (falseFlag) recall.append(node("p", "Ordinary detail you flagged · " + falseFlag.field + " · " + falseFlag.value));
        el("consequence").textContent = state.last;
        el("continue").textContent = state.scene ? "Continue" : "See your score";
        el("continue").hidden = false;
        el("outcome-title").focus();
      } else {
        render();
        if (event.kind === "start") (el("enter").hidden ? el("subject") : el("enter")).focus();
        if (event.kind === "tag") el("clues").children[event.action]?.focus();
      }
    } catch {
      controls.forEach(button => { button.disabled = false; });
      el("error").textContent = "Couldn’t save that action. Try again.";
    } finally {
      busy = false;
      el("site-task").disabled = false;
    }
  }

  el("site-task").onclick = () => {
    if (state.site) void update({ kind: "start" });
    else location.assign(localUrl(state.scene?.address || state.home.address).href);
  };
  el("enter").onclick = () => { opened = true; render(); el("subject").focus(); };
  el("inspect").onclick = () => void update({ kind: "inspect" });
  el("inspect").onpointerenter = () => {
    if (state?.slug === "link-inspector" && !state.scene?.evidence) void update({ kind: "inspect" });
  };
  el("continue").onclick = () => { render(); if (state.scene) el("subject").focus(); };
  progress().then(result => { state = result; render(); }).catch(() => {
    el("error").textContent = "Couldn’t load this exercise. Reload the Chromium tab to try again.";
  });
})();
