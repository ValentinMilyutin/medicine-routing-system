import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  deleteAdminRecipient,
  listAdminFeedback,
  listAdminRecipients,
  saveAdminRecipient,
  updateAdminFeedback,
} from "../operations/operations-api";
import type {
  FeedbackRecipient,
  FeedbackStatus,
  RoutingFeedback,
} from "../operations/types";
import { routingProfileList } from "../routing";

const statusLabels: Record<FeedbackStatus, string> = {
  new: "Новое",
  in_progress: "В работе",
  resolved: "Решено",
  rejected: "Отклонено",
};

const categoryLabels: Record<RoutingFeedback["category"], string> = {
  routing_error: "Ошибка маршрута",
  address_outdated: "Неактуальный адрес",
  document_outdated: "Неактуальный документ",
  suggestion: "Предложение",
  other: "Другое",
};

function profileTitle(profileId: RoutingFeedback["profileId"]) {
  return (
    routingProfileList.find((profile) => profile.id === profileId)?.title ??
    "Профиль не указан"
  );
}

export default function AdminFeedback() {
  const [feedback, setFeedback] = useState<RoutingFeedback[]>([]);
  const [recipients, setRecipients] = useState<FeedbackRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientLabel, setRecipientLabel] = useState("");
  const [recipientSaving, setRecipientSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [feedbackRows, recipientRows] = await Promise.all([
        listAdminFeedback(),
        listAdminRecipients(),
      ]);
      setFeedback(feedbackRows);
      setRecipients(recipientRows);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить обращения.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const newCount = useMemo(
    () => feedback.filter((item) => item.status === "new").length,
    [feedback],
  );

  async function addRecipient(event: FormEvent) {
    event.preventDefault();
    setRecipientSaving(true);
    setError("");
    try {
      const recipient = await saveAdminRecipient({
        email: recipientEmail,
        label: recipientLabel,
        enabled: true,
      });
      setRecipients((current) => [...current, recipient]);
      setRecipientEmail("");
      setRecipientLabel("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось добавить получателя.");
    } finally {
      setRecipientSaving(false);
    }
  }

  async function toggleRecipient(recipient: FeedbackRecipient) {
    setSavingId(`recipient-${recipient.id}`);
    setError("");
    try {
      const saved = await saveAdminRecipient({
        ...recipient,
        enabled: !recipient.enabled,
      });
      setRecipients((current) =>
        current.map((item) => (item.id === saved.id ? saved : item)),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось изменить получателя.");
    } finally {
      setSavingId(null);
    }
  }

  async function removeRecipient(recipient: FeedbackRecipient) {
    if (!window.confirm(`Удалить получателя ${recipient.email}?`)) return;
    setSavingId(`recipient-${recipient.id}`);
    setError("");
    try {
      await deleteAdminRecipient(recipient.id);
      setRecipients((current) => current.filter((item) => item.id !== recipient.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось удалить получателя.");
    } finally {
      setSavingId(null);
    }
  }

  function patchFeedback(id: string, patch: Partial<RoutingFeedback>) {
    setFeedback((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  async function saveFeedback(item: RoutingFeedback) {
    setSavingId(`feedback-${item.id}`);
    setError("");
    try {
      const saved = await updateAdminFeedback({
        id: item.id,
        status: item.status,
        adminNote: item.adminNote,
      });
      patchFeedback(item.id, saved);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить обращение.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Обратная связь</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Сообщения сохраняются в Neon. Персональные и медицинские данные собирать не нужно.
            </p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-900">
            Новых: {newCount}
          </span>
        </div>
        {error && <div role="alert" className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold">Получатели уведомлений</h3>
        <p className="mt-1 text-sm text-neutral-600">
          При настроенном Resend им приходит уведомление с номером обращения; полный текст остаётся в админке.
        </p>
        <form onSubmit={addRecipient} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input
            type="email"
            required
            value={recipientEmail}
            onChange={(event) => setRecipientEmail(event.target.value)}
            placeholder="email@example.ru"
            className="rounded-2xl border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            value={recipientLabel}
            onChange={(event) => setRecipientLabel(event.target.value)}
            placeholder="Например: куратор профиля"
            className="rounded-2xl border border-neutral-300 px-3 py-2 text-sm"
          />
          <button disabled={recipientSaving} className="rounded-2xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            Добавить
          </button>
        </form>
        <div className="mt-4 space-y-2">
          {recipients.length === 0 && <p className="text-sm text-neutral-500">Получатели пока не добавлены.</p>}
          {recipients.map((recipient) => (
            <div key={recipient.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 p-3 text-sm">
              <div>
                <div className="font-medium">{recipient.email}</div>
                <div className="text-xs text-neutral-500">{recipient.label || "Без подписи"} · {recipient.enabled ? "уведомления включены" : "уведомления выключены"}</div>
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={savingId === `recipient-${recipient.id}`} onClick={() => void toggleRecipient(recipient)} className="rounded-xl border border-neutral-300 px-3 py-1.5 disabled:opacity-50">
                  {recipient.enabled ? "Выключить" : "Включить"}
                </button>
                <button type="button" disabled={savingId === `recipient-${recipient.id}`} onClick={() => void removeRecipient(recipient)} className="rounded-xl border border-red-200 px-3 py-1.5 text-red-700 disabled:opacity-50">
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">Обращения врачей</h3>
          <button type="button" onClick={() => void refresh()} className="text-sm text-blue-700 underline">Обновить</button>
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-neutral-500">Загрузка…</p>
        ) : feedback.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">Обращений пока нет.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {feedback.map((item) => (
              <article key={item.id} className="rounded-2xl border border-neutral-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-neutral-500">#{item.id} · {new Date(item.createdAt).toLocaleString("ru-RU")}</div>
                    <div className="mt-1 font-semibold">{categoryLabels[item.category]} · {profileTitle(item.profileId)}</div>
                    <div className="mt-1 text-xs text-neutral-500">
                      Версия: {item.contentVersion || "—"} · результат: {item.resultId || "—"} · правило: {item.ruleId || "—"}
                    </div>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs">Уведомление: {item.notificationStatus}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm">{item.message}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr_auto] md:items-end">
                  <label className="text-xs text-neutral-600">
                    Статус
                    <select value={item.status} onChange={(event) => patchFeedback(item.id, { status: event.target.value as FeedbackStatus })} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900">
                      {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <label className="text-xs text-neutral-600">
                    Внутренний комментарий
                    <input value={item.adminNote} onChange={(event) => patchFeedback(item.id, { adminNote: event.target.value })} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900" />
                  </label>
                  <button type="button" disabled={savingId === `feedback-${item.id}`} onClick={() => void saveFeedback(item)} className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Сохранить</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
