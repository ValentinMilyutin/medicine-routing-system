import type {
  FeedbackRecipient,
  RoutingFeedback,
} from "./operations-store.js";

export type FeedbackNotificationResult = {
  status: "sent" | "not_configured" | "failed";
  error?: string;
};

const CATEGORY_LABELS: Record<RoutingFeedback["category"], string> = {
  routing_error: "Ошибка маршрутизации",
  address_outdated: "Неактуальный адрес",
  document_outdated: "Неактуальный нормативный документ",
  suggestion: "Предложение",
  other: "Другое",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendFeedbackNotification(input: {
  feedback: RoutingFeedback;
  recipients: FeedbackRecipient[];
  requestOrigin: string;
}): Promise<FeedbackNotificationResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FEEDBACK_FROM_EMAIL;
  if (!apiKey || !from || input.recipients.length === 0) {
    return { status: "not_configured" };
  }
  const configuredSiteUrl = process.env.PUBLIC_SITE_URL;
  const siteUrl = configuredSiteUrl?.startsWith("https://")
    ? configuredSiteUrl.replace(/\/$/, "")
    : input.requestOrigin;
  const adminUrl = `${siteUrl}/?admin=1`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.recipients.map((recipient) => recipient.email),
        subject: `Новое обращение по маршрутизации №${input.feedback.id}`,
        html: `
          <h2>Новое обращение №${escapeHtml(input.feedback.id)}</h2>
          <p><b>Категория:</b> ${escapeHtml(CATEGORY_LABELS[input.feedback.category])}</p>
          <p><b>Профиль:</b> ${escapeHtml(input.feedback.profileId ?? "не указан")}</p>
          <p><b>Версия:</b> ${escapeHtml(input.feedback.contentVersion ?? "не указана")}</p>
          <p>Полный текст обращения хранится только в административном контуре.</p>
          <p><a href="${escapeHtml(adminUrl)}">Открыть административную панель</a></p>
        `,
      }),
    });
    if (!response.ok) {
      return {
        status: "failed",
        error: `Resend вернул HTTP ${response.status}.`,
      };
    }
    return { status: "sent" };
  } catch (reason) {
    return {
      status: "failed",
      error:
        reason instanceof Error
          ? reason.message.slice(0, 1000)
          : "Не удалось отправить уведомление.",
    };
  }
}
