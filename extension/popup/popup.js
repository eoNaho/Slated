import { SITE_BASE } from "../config.js";

const $ = (id) => document.getElementById(id);

const dot = $("status-dot");
const label = $("status-label");
const titleEl = $("status-title");
const metaEl = $("status-meta");
const toggle = $("toggle-tracking");
const tokenIn = $("token-input");
const btnSave = $("btn-save");
const btnClear = $("btn-clear");
const btnEye = $("btn-eye");
const iconEye = $("icon-eye");
const iconEyeOff = $("icon-eye-off");
const hint = $("save-hint");
const tokenLink = $("token-link");

if (tokenLink) tokenLink.href = `${SITE_BASE}/settings/tokens`;

chrome.storage.local.get(
  ["token", "trackingEnabled"],
  ({ token, trackingEnabled }) => {
    if (token) tokenIn.value = token;
    toggle.checked = trackingEnabled !== false;
    refreshStatus();
  },
);

function refreshStatus() {
  chrome.runtime.sendMessage({ type: "GET_STATUS" }, (res) => {
    if (chrome.runtime.lastError || !res?.state) {
      setStatus("inactive", "Sem atividade");
      return;
    }
    const { status, title } = res.state;
    if (status === "watching") setStatus("active", title, buildMeta(res.state));
    else if (status === "paused") setStatus("paused", title, "Pausado");
    else setStatus("inactive", "Sem atividade");
  });
}

function buildMeta(state) {
  const parts = [];
  if (state.season != null) parts.push(`T${state.season} E${state.episode}`);
  if (state.progress != null) parts.push(`${Math.round(state.progress)}%`);
  if (state.source) parts.push(capitalize(state.source));
  return parts.join(" · ");
}

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : "";
}

function setStatus(type, title, meta = "") {
  const labels = {
    active: "Assistindo agora",
    paused: "Pausado",
    inactive: "Inativo",
    error: "Erro",
  };
  dot.className = `status-dot ${type}`;
  label.textContent = labels[type] ?? type;
  titleEl.textContent = title ?? "";
  metaEl.textContent = meta;
}

setInterval(refreshStatus, 5_000);

toggle.addEventListener("change", () => {
  chrome.storage.local.set({ trackingEnabled: toggle.checked }, () => {
      refreshStatus(); // Atualiza na hora que pausa
  });
});

btnSave.addEventListener("click", () => {
  const value = tokenIn.value.trim();
  if (!value) {
    showHint("Cole o token antes de salvar.", "error");
    return;
  }
  chrome.storage.local.set({ token: value }, () =>
    showHint("Token salvo com sucesso! ✓", "ok"),
  );
});

btnClear.addEventListener("click", () => {
  chrome.storage.local.remove("token", () => {
    tokenIn.value = "";
    showHint("Token removido.", "");
  });
});

let visible = false;
btnEye.addEventListener("click", () => {
  visible = !visible;
  tokenIn.type = visible ? "text" : "password";
  btnEye.title = visible ? "Ocultar token" : "Mostrar token";
  
  // Alterna entre os SVGs
  iconEye.style.display = visible ? "none" : "block";
  iconEyeOff.style.display = visible ? "block" : "none";
});

let hintTimeout;
function showHint(msg, type) {
  hint.textContent = msg;
  hint.className = `hint show ${type}`;
  clearTimeout(hintTimeout);
  if (msg)
    hintTimeout = setTimeout(() => {
      hint.className = "hint";
    }, 3000);
}
