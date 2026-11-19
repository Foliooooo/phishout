(() => {
  const el = id => document.getElementById(id);
  const mode = document.body.dataset.mode;
  document.title = { chat: "Direct · Fakestagram", mail: "Inbox · Mail", signup: "Sign up · Fakestagram" }[mode];
  let state;
  let sending = false;
  el("thread-search").oninput = event => {
    const query = event.target.value.trim().toLowerCase();
    document.querySelectorAll("[data-thread]").forEach(thread => {
      thread.hidden = !thread.textContent.toLowerCase().includes(query);
    });
  };

  async function progress(event) {
    const response = await fetch("/progress", event ? {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    } : { cache: "no-store" });
    if (!response.ok) throw new Error("Exercise connection lost");
    state = await response.json();
    return state;
  }

  function finish() {
    const safe = state.answer === 1;
    el("ending-title").textContent = safe ? "You spotted the fake logout." : "You took the bait.";
    el("ending-copy").textContent = safe
      ? "You checked the original tab and reported the email."
      : "The lookalike received the practice details. With a real password, this could have exposed your account.";
    el("ending-score").textContent = `${state.xp} XP`;
    el("path").replaceChildren(...state.timeline.map(label => Object.assign(document.createElement("li"), { textContent: label })));
    el("rewind").hidden = safe;
    el("rewind").onclick = async () => {
      await progress({ type: "rewind" });
      location.assign("http://fakestagram.example:8080/direct/inbox");
    };
    el("score-breakdown").replaceChildren(...(state.breakdown ?? []).map(item => {
      const row = document.createElement("li");
      row.textContent = `${item.label} · ${item.points} XP`;
      return row;
    }));
    if (el("session-dialog").open) el("session-dialog").close();
    if (el("logout")?.open) el("logout").close();
    if (!el("ending").open) el("ending").showModal();
  }

  el("close-ending").onclick = () => el("ending").close();

  function addMessage(text, outgoing = false) {
    const bubble = document.createElement("p");
    bubble.className = outgoing ? "bubble outgoing" : "bubble incoming";
    bubble.textContent = text;
    el("transcript").append(bubble);
    el("transcript").scrollTop = el("transcript").scrollHeight;
    el("preview").textContent = text;
  }

  const sideThreads = {
    pizza: { name: "Pizza people", handle: "Alex, Sam and Mina", avatar: "P", style: "friends", messages: [
      "Alex: same time next Thursday?", "Mina: I can get there after seven", "Alex: perfect, I’ll book the usual table",
    ] },
    jordan: { name: "Jordan", handle: "jordan.walks", avatar: "J", style: "sam", messages: [
      "this looks like the dog we saw outside the pizza place", "Sent you a reel",
    ] },
  };

  function openThread(key) {
    const side = sideThreads[key];
    for (const button of document.querySelectorAll("[data-thread]")) {
      const selected = button.dataset.thread === key;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
    el("contact-name").textContent = side?.name ?? "Riley";
    el("contact-handle").textContent = side?.handle ?? "riley.afterhours";
    el("contact-avatar").textContent = side?.avatar ?? "R";
    el("contact-avatar").className = `avatar ${side?.style ?? "riley"}`;
    el("transcript").hidden = Boolean(side);
    el("side-transcript").hidden = !side;
    el("chat-form").hidden = Boolean(side);
    el("typing").hidden = Boolean(side);
    if (side) {
      el("side-transcript").replaceChildren(...side.messages.map(message => {
        const bubble = document.createElement("p");
        bubble.className = "bubble incoming";
        bubble.textContent = message;
        return bubble;
      }));
    }
  }

  function initChat() {
    const poll = el("plan-poll");
    function selectPlan(plan) {
      poll.querySelector("p").textContent = plan ? "Your vote · " + plan : "";
      poll.querySelectorAll("button").forEach(button => button.setAttribute("aria-pressed", String(button.textContent === plan)));
    }
    selectPlan(sessionStorage.getItem("saturday-plan"));
    poll.querySelectorAll("button").forEach(button => button.onclick = () => {
      sessionStorage.setItem("saturday-plan", button.textContent);
      selectPlan(button.textContent);
    });
    for (const button of document.querySelectorAll("[data-thread]")) button.onclick = () => openThread(button.dataset.thread);
    el("message").disabled = state.messages === 3;
    let sent;
    try { sent = JSON.parse(sessionStorage.getItem(location.pathname + ":sam-chat") || "[]"); } catch { sent = []; }
    for (const [index, reply] of state.reactions.entries()) {
      if (sent[index]) addMessage(sent[index], true);
      addMessage(reply);
    }
    if (state.answer !== null) finish();

    el("chat-form").onsubmit = async event => {
      event.preventDefault();
      const input = el("message");
      const text = input.value.trim();
      if (!text || sending) return;
      if (state.messages >= 3) {
        if (!state.dismissed || state.confirmed) return;
        sending = true;
        try {
          await progress({ type: "confirm_plan" });
          addMessage(text, true);
          addMessage("booked! Cedar Roof, Saturday at seven. see you there");
          input.value = "";
          input.disabled = true;
        } finally { sending = false; }
        return;
      }
      sending = true;
      const turn = state.messages;
      input.value = "";
      addMessage(text, true);
      el("typing").textContent = "Riley is typing…";
      try {
        // The VM gets a turn number only. The typed message stays in the tab.
        await progress({ type: "message", turn });
        sent[turn] = text;
        sessionStorage.setItem(location.pathname + ":sam-chat", JSON.stringify(sent));
        await new Promise(resolve => window.setTimeout(resolve, 420));
        addMessage(state.reactions[turn]);
        if (state.messages === 3) {
          input.disabled = true;
          window.setTimeout(() => document.dispatchEvent(new Event("fakestagram:reply-rendered")), 620);
        } else input.focus();
      } catch {
        el("transcript").lastElementChild?.remove();
        input.value = text;
        el("typing").textContent = "Couldn’t send. Try again.";
        sending = false;
        return;
      }
      el("typing").textContent = "";
      sending = false;
    };

    el("session").onclick = async () => {
      try {
        await progress();
        if (state.answer !== null) return finish();
        el("report").hidden = !(state.dismissed && state.mailOpened);
        el("session-dialog").showModal();
      } catch {
        el("typing").textContent = "Couldn’t open session details.";
      }
    };
    el("close-details").onclick = () => el("session-dialog").close();
    el("report").onclick = async () => {
      try {
        await progress({ type: "report" });
        finish();
      } catch {
        el("typing").textContent = "Couldn’t report the email. Try again.";
      }
    };
    async function refreshChat() {
      if (document.hidden || sending || state.answer !== null) return;
      try {
        await progress();
        if (state.dismissed && !state.confirmed && state.answer === null) el("message").disabled = false;
        if (state.answer !== null) finish();
      } catch {}
    }
    document.addEventListener("visibilitychange", () => void refreshChat());
    window.addEventListener("focus", () => void refreshChat());
    // A visit to another browser tab can change the mission outcome.
    window.setInterval(() => { if (state.messages === 3) void refreshChat(); }, 1200);

  }

  function initMail() {
    function renderInbox() {
      el("email").hidden = !state.trap;
      el("empty").hidden = true;
      el("unread").textContent = state.trap && !state.mailOpened ? "1" : "";
    }
    renderInbox();
    const routineMail = {
      pizza: ["Receipt for Saturday", "Thanks for stopping by. Two slices and a lemonade · $12.50 paid."],
      library: ["Your hold is ready", "The book you reserved is at the front desk through Friday."],
    };
    for (const button of document.querySelectorAll("[data-mail]")) {
      button.onclick = () => {
        const [subject, body] = routineMail[button.dataset.mail];
        el("routine-subject").textContent = subject;
        el("routine-body").textContent = body;
        el("letter").hidden = true;
        el("routine-letter").hidden = false;
      };
    }
    const refreshInbox = async () => {
      if (document.hidden || state.trap) return;
      try { await progress(); renderInbox(); } catch {}
    };
    const inboxTimer = setInterval(() => {
      if (state.trap) clearInterval(inboxTimer);
      else void refreshInbox();
    }, 1500);
    el("email").onclick = async () => {
      try {
        await progress({ type: "read_mail" });
        renderInbox();
        el("routine-letter").hidden = true;
        el("letter").hidden = false;
      } catch {
        el("empty").hidden = false;
        el("empty").textContent = "Couldn’t open this message. Try again.";
      }
    };
    async function inspect() {
      el("destination").hidden = false;
      try { await progress({ type: "inspect_link" }); } catch {}
    }
    el("inspect").onclick = () => void inspect();
    el("invite").addEventListener("mouseenter", () => void inspect(), { once: true });
    document.addEventListener("visibilitychange", async () => {
      if (!document.hidden) {
        try { await progress(); renderInbox(); } catch {}
      }
    });
  }

  function initSignup() {
    if (state.answer !== null) finish();
    el("fill-demo").onclick = () => {
      el("demo-user").value = "sam.demo";
      el("demo-pass").value = "training-only";
      el("signup-submit").disabled = false;
    };
    el("demo-form").onsubmit = async event => {
      event.preventDefault();
      try {
        await progress({ type: "submit_demo" });
        finish();
      } catch {
        el("fill-demo").textContent = "Couldn’t submit. Try again.";
      }
    };
  }

  progress().then(() => {
    if (mode === "chat") initChat();
    else if (mode === "mail") initMail();
    else if (mode === "signup") initSignup();
  }).catch(() => {
    const error = document.createElement("p");
    error.setAttribute("role", "alert");
    error.textContent = "Couldn’t load the sandbox. Reload this tab to try again.";
    document.body.prepend(error);
  });
})();
