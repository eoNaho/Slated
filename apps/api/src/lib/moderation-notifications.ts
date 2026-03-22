import { createNotification } from "../routes/notifications";

const templates: Record<string, { title: string; message: string }> = {
  warn: {
    title: "Aviso de Conteúdo",
    message: "Seu conteúdo foi sinalizado por violar as diretrizes da comunidade.",
  },
  hide_content: {
    title: "Conteúdo Ocultado",
    message: "Seu conteúdo foi ocultado por um moderador para revisão.",
  },
  restore: {
    title: "Conteúdo Restaurado",
    message: "Seu conteúdo foi restaurado após revisão.",
  },
  suspend_user: {
    title: "Conta Suspensa",
    message: "Sua conta foi temporariamente suspensa por violação das diretrizes.",
  },
};

export async function notifyModerationAction(
  userId: string,
  action: string,
  details?: Record<string, any>
) {
  const tpl = templates[action];
  if (!tpl) return;

  const notifType =
    action === "warn"
      ? "moderation_warning"
      : action === "hide_content"
        ? "content_hidden"
        : action === "restore"
          ? "content_restored"
          : action === "suspend_user"
            ? "account_suspended"
            : "system";

  await createNotification(userId, notifType as any, tpl.title, tpl.message, details);
}
