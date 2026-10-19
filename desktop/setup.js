// Draws the setup screens the desktop app shows before the dashboard: install, OpenFit found,
// update, messages and progress. The app (main.js) sends a screen; buttons send back a choice.
// Everything is built with textContent, so folder names can't inject markup.
const bridge = window.openfit;
const card = document.getElementById("card");

const el = (tag, props = {}, ...children) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") n.className = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) if (c != null && c !== false) n.append(c);
  return n;
};

const ICONS = {
  warning: "M12 3 2 21h20L12 3Zm0 6v5m0 3v.01",
  error: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-3 6 6 6m0-6-6 6",
  ok: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-4 9 3 3 5-6",
};
function toneIcon(tone) {
  if (!ICONS[tone]) return null;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", `tone ${tone}`);
  svg.setAttribute("aria-hidden", "true");
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", ICONS[tone]);
  p.setAttribute("fill", "none");
  p.setAttribute("stroke", "currentColor");
  p.setAttribute("stroke-width", "2");
  p.setAttribute("stroke-linecap", "round");
  p.setAttribute("stroke-linejoin", "round");
  svg.append(p);
  return svg;
}

/** The Pro training switch; `state.pro` follows it. */
function proSwitch(state) {
  const input = el("input", { type: "checkbox", id: "pro" });
  input.checked = state.pro;
  input.addEventListener("change", () => (state.pro = input.checked));
  return el(
    "label",
    { class: "option", for: "pro" },
    el("span", { class: "switch" }, input, el("i")),
    el(
      "div",
      {},
      el("strong", {}, "Add Pro training"),
      el("span", {}, "An 870-exercise library with photos, personal-record alerts, a plate and warm-up calculator, supersets and your own programs. Switch it on or off later in Settings."),
    ),
  );
}

/** Buttons: { id, label, kind: "primary" | "quiet" | undefined }. Enter picks the primary one, Esc the `cancel` one. */
function actions(list, choose) {
  return el(
    "div",
    { class: "actions" },
    list.map((a, i) => [
      a.kind === "quiet" && i > 0 ? el("span", { class: "spacer" }) : null,
      el("button", { type: "button", class: a.kind ?? "", "data-action": a.id, onclick: () => choose(a.id) }, a.label),
    ]),
  );
}

const screens = {
  install(s, state, choose) {
    const path = el("div", { class: "path", id: "folder" }, state.folder);
    return [
      el("h2", {}, "Install OpenFit"),
      el("p", {}, "Sets up OpenFit on this PC: the app, its database and the AI coach. Setup opens in its own window, asks its few questions first, then runs by itself."),
      el(
        "div",
        { class: "field" },
        el("span", { class: "label" }, "Install in"),
        el(
          "div",
          { class: "path-row" },
          path,
          el("button", {
            type: "button",
            "data-action": "change-folder",
            onclick: async () => {
              const picked = await bridge.pickFolder();
              if (picked) {
                state.folder = picked;
                path.textContent = picked;
              }
            },
          }, "Change…"),
        ),
      ),
      proSwitch(state),
      actions(
        [
          { id: "install", label: "Install OpenFit", kind: "primary" },
          { id: "existing", label: "I already have OpenFit" },
          { id: "quit", label: "Quit", kind: "quiet" },
        ],
        choose,
      ),
    ];
  },

  existing(s, state, choose) {
    return [
      el("h2", {}, toneIcon("ok"), "OpenFit is already on this PC"),
      el("p", {}, `Found OpenFit ${s.found} in:`),
      el("div", { class: "field" }, el("div", { class: "path" }, s.folder)),
      s.update
        ? el("p", { class: "note" }, `This app includes OpenFit ${s.update}. Updating keeps your data, settings and passcode.`)
        : el("p", { class: "note" }, "It's up to date. The app will open it."),
      actions(
        [
          { id: "use", label: s.update ? "Use it and update" : "Use it", kind: "primary" },
          { id: "other", label: "Choose another folder…" },
          { id: "install", label: "Install a new copy" },
          { id: "quit", label: "Quit", kind: "quiet" },
        ],
        choose,
      ),
    ];
  },

  update(s, state, choose) {
    return [
      el("h2", {}, `Update OpenFit to ${s.to}`),
      el("p", {}, `Your OpenFit folder has ${s.from}. Updating keeps your data, settings and passcode; Setup then updates the packages, which takes a minute or two.`),
      el("div", { class: "field" }, el("div", { class: "path" }, s.folder)),
      s.pro === null ? null : proSwitch(state),
      actions(
        [
          { id: "update", label: "Update", kind: "primary" },
          { id: "skip", label: "Not now", kind: "quiet" },
        ],
        choose,
      ),
    ];
  },

  message(s, state, choose) {
    return [
      el("h2", {}, toneIcon(s.tone), s.title),
      s.text ? el("p", {}, s.text) : null,
      s.detail ? el("pre", {}, s.detail) : null,
      actions(s.actions, choose),
    ];
  },

  status(s) {
    return [
      el(
        "div",
        { class: "status" },
        el("div", { class: "spinner", "aria-hidden": "true" }),
        el("div", {}, el("strong", {}, s.title), s.text ? el("p", {}, s.text) : null),
      ),
    ];
  },
};

let current = false; // a screen waiting for a choice (not a progress screen)

function show(s) {
  if (s.appVersion) document.getElementById("version").textContent = `v${s.appVersion}`;
  const state = { folder: s.folder, pro: s.pro ?? true };
  const choose = (action) => {
    current = false;
    bridge.choose({ action, folder: state.folder, pro: state.pro });
  };
  card.replaceChildren(...screens[s.screen](s, state, choose).flat(Infinity).filter(Boolean));
  current = s.screen !== "status";
  card.querySelector("button.primary")?.focus();
}

document.addEventListener("keydown", (e) => {
  if (!current) return;
  if (e.key === "Escape") {
    const cancel = card.querySelector('[data-action="quit"], [data-action="skip"], [data-action="cancel"]');
    if (cancel) cancel.click();
  }
});

document.getElementById("source").addEventListener("click", () => bridge.openSource());
bridge.onScreen(show);
bridge.ready();
