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

// ── Watch Party ──────────────────────────────────────────────────────────────

const wpIdle = $("wp-idle");
const wpActive = $("wp-active");
const wpBtnCreate = $("wp-btn-create");
const wpBtnJoinToggle = $("wp-btn-join-toggle");
const wpJoinForm = $("wp-join-form");
const wpCreateForm = $("wp-create-form");
const wpCodeInput = $("wp-code-input");
const wpTitleInput = $("wp-title-input");
const wpBtnJoinConfirm = $("wp-btn-join-confirm");
const wpBtnCreateConfirm = $("wp-btn-create-confirm");
const wpBadgeCode = $("wp-badge-code");
const wpRoomTitle = $("wp-room-title");
const wpMembers = $("wp-members");
const wpChatMessages = $("wp-chat-messages");
const wpChatInput = $("wp-chat-input");
const wpBtnChatSend = $("wp-btn-chat-send");
const wpBtnLeave = $("wp-btn-leave");
const wpBtnEnd = $("wp-btn-end");
const wpHintIdle = $("wp-hint-idle");
const wpHintActive = $("wp-hint-active");

function showWpHint(el, msg, type = "") {
  el.textContent = msg;
  el.className = `hint show ${type}`;
  setTimeout(() => { el.className = "hint"; }, 3000);
}

function showWpActive(room) {
  wpIdle.classList.add("hidden");
  wpActive.classList.remove("hidden");

  wpBadgeCode.textContent = room.code;
  wpRoomTitle.textContent = room.title ?? "";

  // Mostrar botão encerrar só pro host
  chrome.storage.local.get(["userId"], ({ userId }) => {
    if (room.hostUserId === userId || room.isHost) {
      wpBtnEnd.classList.remove("hidden");
    }
  });

  renderMembers(room.members ?? []);
}

function showWpIdle() {
  wpActive.classList.add("hidden");
  wpIdle.classList.remove("hidden");
  wpBtnEnd.classList.add("hidden");
  wpJoinForm.classList.add("hidden");
  wpCreateForm.classList.add("hidden");
  wpChatMessages.innerHTML = "";
  wpMembers.innerHTML = "";
}

function renderMembers(members) {
  wpMembers.innerHTML = members.map(m => {
    const isHost = m.isHost ? "host" : "";
    return `<span class="wp-member-chip ${isHost}">${m.username ?? m.userId}</span>`;
  }).join("");
}

function appendChatMsg(msg) {
  const el = document.createElement("div");
  el.className = "wp-chat-msg";
  el.innerHTML = `<span class="wp-msg-author">${msg.username ?? msg.userId}:</span>${msg.content}`;
  wpChatMessages.appendChild(el);
  wpChatMessages.scrollTop = wpChatMessages.scrollHeight;
}

// Verificar estado inicial do WP
function refreshWpState() {
  chrome.runtime.sendMessage({ type: "WP_GET_STATE" }, (res) => {
    if (chrome.runtime.lastError || !res) return;
    if (res.active && res.room) {
      showWpActive(res.room);
      // Carregar mensagens salvas
      chrome.storage.local.get(["wpMessages"], ({ wpMessages }) => {
        (wpMessages ?? []).forEach(appendChatMsg);
      });
    } else {
      showWpIdle();
    }
  });
}

refreshWpState();

// Criar sala
wpBtnCreate.addEventListener("click", () => {
  wpJoinForm.classList.add("hidden");
  wpCreateForm.classList.toggle("hidden");
});

wpBtnJoinToggle.addEventListener("click", () => {
  wpCreateForm.classList.add("hidden");
  wpJoinForm.classList.toggle("hidden");
});

wpBtnCreateConfirm.addEventListener("click", () => {
  const title = wpTitleInput.value.trim();
  if (!title) { showWpHint(wpHintIdle, "Digite um nome para a sessão.", "error"); return; }
  wpBtnCreateConfirm.disabled = true;
  chrome.runtime.sendMessage({
    type: "WP_CREATE_ROOM",
    params: { title },
  }, (res) => {
    wpBtnCreateConfirm.disabled = false;
    if (chrome.runtime.lastError || res?.error) {
      showWpHint(wpHintIdle, res?.error ?? "Erro ao criar sala.", "error");
      return;
    }
    showWpActive({ ...res.room, isHost: true });
  });
});

wpBtnJoinConfirm.addEventListener("click", () => {
  const code = wpCodeInput.value.trim().toUpperCase();
  if (code.length !== 6) { showWpHint(wpHintIdle, "Código deve ter 6 caracteres.", "error"); return; }
  wpBtnJoinConfirm.disabled = true;
  chrome.runtime.sendMessage({ type: "WP_JOIN_ROOM", code }, (res) => {
    wpBtnJoinConfirm.disabled = false;
    if (chrome.runtime.lastError || res?.error) {
      showWpHint(wpHintIdle, res?.error ?? "Erro ao entrar na sala.", "error");
      return;
    }
    showWpActive({ code, title: "", isHost: false });
    showWpHint(wpHintActive, "Conectando…", "");
  });
});

wpBtnLeave.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "WP_LEAVE_ROOM" }, () => showWpIdle());
});

wpBtnEnd.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "WP_LEAVE_ROOM" }, () => showWpIdle());
});

// Copiar código ao clicar no badge
wpBadgeCode.addEventListener("click", () => {
  navigator.clipboard.writeText(wpBadgeCode.textContent).then(() => {
    showWpHint(wpHintActive, "Código copiado!", "ok");
  });
});

// Chat — enviar mensagem
function sendChat() {
  const content = wpChatInput.value.trim();
  if (!content) return;
  wpChatInput.value = "";
  chrome.runtime.sendMessage({ type: "WP_SEND_CHAT", content });
}

wpBtnChatSend.addEventListener("click", sendChat);
wpChatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChat();
});

// Polling para atualizar estado e mensagens (a cada 2s quando popup aberto)
setInterval(() => {
  chrome.runtime.sendMessage({ type: "WP_GET_STATE" }, (res) => {
    if (chrome.runtime.lastError || !res?.active) return;
    if (res.room) renderMembers(res.room.members ?? []);
  });

  // Atualizar mensagens do chat
  chrome.storage.local.get(["wpMessages"], ({ wpMessages }) => {
    const msgs = wpMessages ?? [];
    const currentCount = wpChatMessages.children.length;
    if (msgs.length > currentCount) {
      for (let i = currentCount; i < msgs.length; i++) {
        appendChatMsg(msgs[i]);
      }
    }
  });
}, 2000);
