(() => {
  if (location.origin !== "http://fakestagram.example:8080" || location.pathname !== "/direct/inbox") return;

  let pending = false;

  async function progress(type) {
    const response = await fetch("/progress", type ? {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    } : { cache: "no-store" });
    if (!response.ok) throw new Error("Exercise progress unavailable");
    return response.json();
  }

  function showOverlay() {
    if (document.getElementById("logout")) return;
    const popup = document.createElement("dialog");
    popup.id = "logout";
    popup.className = "dialog";
    popup.setAttribute("aria-labelledby", "logout-title");

    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.className = "dismiss";
    dismiss.setAttribute("aria-label", "Dismiss session overlay");
    dismiss.textContent = "×";

    const logo = document.createElement("div");
    logo.className = "wordmark";
    logo.textContent = "Fakestagram";

    const heading = document.createElement("h2");
    heading.id = "logout-title";
    heading.textContent = "Session expired";
    const message = document.createElement("p");
    message.textContent = "We couldn’t refresh your session. Check your inbox to get back to Direct.";

    const inbox = document.createElement("a");
    inbox.className = "blue";
    inbox.href = "http://mail.fakestagram.example:8080/inbox";
    inbox.target = "_blank";
    inbox.rel = "noopener";
    inbox.textContent = "Check your email";

    async function closeOverlay() {
      if (dismiss.disabled) return;
      dismiss.disabled = true;
      try {
        await progress("dismiss");
        popup.close();
        popup.remove();
        document.getElementById("session")?.focus();
      } catch {
        message.textContent = "Couldn’t close this notice. Try again.";
      } finally {
        dismiss.disabled = false;
      }
    }
    dismiss.onclick = () => void closeOverlay();
    popup.oncancel = event => { event.preventDefault(); void closeOverlay(); };
    popup.append(dismiss, logo, heading, message, inbox);
    document.body.append(popup);
    popup.showModal();
  }

  async function sync(trigger = false) {
    if (pending) return;
    pending = true;
    try {
      let state = await progress(trigger ? "trigger_training_notice" : undefined);
      if (!trigger && state.messages === 3 && !state.trap) state = await progress("trigger_training_notice");
      if (state.trap) document.getElementById("mail-dot").hidden = false;
      if (state.trap && !state.dismissed && state.answer === null) showOverlay();
    } finally {
      pending = false;
    }
  }

  document.addEventListener("fakestagram:reply-rendered", () => {
    void sync(true).catch(() => {
      window.setTimeout(() => void sync(true).catch(() => {}), 600);
    });
  });
  void sync().catch(() => {});
})();
