import { useEffect, useState, type FormEvent } from "react";
import type { RoutingProfileId } from "../routing";
import { submitRoutingFeedback } from "./operations-api";
import {
  getPublicRoutingContext,
  subscribePublicRoutingContext,
} from "./routing-context";
import type { FeedbackCategory, PublicRoutingContext } from "./types";

const CATEGORY_OPTIONS: Array<{ value: FeedbackCategory; label: string }> = [
  { value: "routing_error", label: "Ошибка маршрутизации" },
  { value: "address_outdated", label: "Неактуальный адрес" },
  { value: "document_outdated", label: "Неактуальный приказ или ссылка" },
  { value: "suggestion", label: "Предложение по изменению" },
  { value: "other", label: "Другое" },
];

export default function FeedbackWidget(props: {
  profileId?: RoutingProfileId;
  fallbackVersion?: string;
}) {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<PublicRoutingContext | null>(
    getPublicRoutingContext(),
  );
  const [category, setCategory] =
    useState<FeedbackCategory>("routing_error");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [error, setError] = useState("");

  useEffect(() => subscribePublicRoutingContext(setContext), []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setState("sending");
    setError("");
    try {
      await submitRoutingFeedback({
        category,
        message,
        website,
        profileId: context?.profileId ?? props.profileId,
        contentVersion: context?.contentVersion ?? props.fallbackVersion,
        resultId: context?.resultId,
        ruleId: context?.ruleId,
      });
      setMessage("");
      setState("sent");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Не удалось отправить обращение.",
      );
      setState("error");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setState("idle");
        }}
        className="fixed bottom-4 right-4 z-30 rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-neutral-800"
      >
        Обратная связь
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Обратная связь"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Сообщить об ошибке</h2>
                <p className="mt-1 text-sm text-neutral-600">
                  Обращение увидит администратор маршрутизации.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-neutral-200 px-3 py-1.5 text-sm"
                aria-label="Закрыть"
              >
                Закрыть
              </button>
            </div>

            {state === "sent" ? (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                Обращение сохранено. Спасибо за уточнение.
              </div>
            ) : (
              <form className="mt-5 space-y-4" onSubmit={submit}>
                <label className="block text-sm font-medium">
                  Категория
                  <select
                    value={category}
                    onChange={(event) =>
                      setCategory(event.currentTarget.value as FeedbackCategory)
                    }
                    className="mt-1 w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2"
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Что требуется проверить или изменить
                  <textarea
                    required
                    minLength={10}
                    maxLength={4000}
                    rows={6}
                    value={message}
                    onChange={(event) => setMessage(event.currentTarget.value)}
                    className="mt-1 w-full rounded-2xl border border-neutral-300 px-3 py-2"
                    placeholder="Опишите проблему и ожидаемый вариант маршрута"
                  />
                </label>
                <label className="hidden" aria-hidden="true">
                  Сайт
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(event) => setWebsite(event.currentTarget.value)}
                  />
                </label>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                  Не указывайте ФИО, телефон, адрес проживания и другие данные
                  пациента. Контекст профиля и версии прикладывается автоматически.
                </div>
                {state === "error" ? (
                  <div role="alert" className="text-sm text-red-700">
                    {error}
                  </div>
                ) : null}
                <button
                  type="submit"
                  disabled={state === "sending" || message.trim().length < 10}
                  className="w-full rounded-2xl bg-neutral-900 px-4 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {state === "sending" ? "Сохранение…" : "Отправить обращение"}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
