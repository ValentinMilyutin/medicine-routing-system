import { useMemo, useState } from "react";
import {
  publicationBlockers,
  routingContentDocuments,
  routingProfileList,
  type RoutingContentStatus,
  type RoutingProfileId,
} from "../routing";
import type { AdminUser } from "./admin-api";
import AdminDrafts from "./AdminDrafts";

const STATUS_LABELS: Record<RoutingContentStatus, string> = {
  draft: "Черновик",
  in_review: "На проверке",
  approved: "Утверждено",
  archived: "В архиве",
};

export default function AdminDashboard(props: {
  user: AdminUser;
  onLogout: () => Promise<void>;
}) {
  const [selectedProfile, setSelectedProfile] =
    useState<RoutingProfileId>("obgyn");
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const document = useMemo(
    () =>
      routingContentDocuments.find(
        (item) => item.profileId === selectedProfile,
      )!,
    [selectedProfile],
  );
  const selectedSummary = routingProfileList.find(
    (item) => item.id === selectedProfile,
  )!;
  const blockers = publicationBlockers(document);

  async function logout() {
    setLoggingOut(true);
    setLogoutError("");
    try {
      await props.onLogout();
    } catch (reason) {
      setLogoutError(
        reason instanceof Error ? reason.message : "Не удалось выйти.",
      );
      setLoggingOut(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Полный административный доступ
            </div>
            <h1 className="mt-1 text-2xl font-bold">Контур администрации</h1>
            <p className="mt-1 text-sm text-neutral-600">
              Активная учётная запись: {props.user.username}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
          >
            {loggingOut ? "Выход…" : "Выйти"}
          </button>
        </div>
        {logoutError && (
          <div role="alert" className="mt-3 text-sm text-red-700">
            {logoutError}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="px-2 text-lg font-semibold">Профили и версии</h2>
          <div className="mt-3 space-y-2">
            {routingProfileList.map((profile) => {
              const content = routingContentDocuments.find(
                (item) => item.profileId === profile.id,
              )!;
              const count = publicationBlockers(content).length;
              const active = profile.id === selectedProfile;
              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => setSelectedProfile(profile.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-black bg-neutral-900 text-white"
                      : "border-neutral-200 hover:bg-neutral-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{profile.title}</div>
                      <div
                        className={`mt-1 text-xs ${active ? "text-neutral-300" : "text-neutral-500"}`}
                      >
                        Версия {profile.contentVersion} · {STATUS_LABELS[profile.status]}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        count > 0
                          ? "bg-amber-100 text-amber-900"
                          : "bg-emerald-100 text-emerald-900"
                      }`}
                    >
                      {count} блок.
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm text-neutral-500">Выбранный профиль</div>
              <h2 className="text-xl font-bold">{selectedSummary.title}</h2>
            </div>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm">
              {STATUS_LABELS[document.status]}
            </span>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Версия", document.contentVersion],
              ["Вопросы", document.questions.length],
              ["Ветки", document.branches.length],
              ["Источники", document.sources.length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-neutral-50 p-3">
                <dt className="text-xs text-neutral-500">{label}</dt>
                <dd className="mt-1 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5">
            <h3 className="font-semibold">Блокирующие вопросы</h3>
            {blockers.length === 0 ? (
              <p className="mt-2 text-sm text-emerald-700">Открытых блокировок нет.</p>
            ) : (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
                {blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-5">
            <h3 className="font-semibold">Официальные источники</h3>
            <ul className="mt-2 space-y-2">
              {document.sources.map((source) => (
                <li key={source.id} className="rounded-2xl border border-neutral-200 p-3 text-sm">
                  <div className="font-medium">{source.label}</div>
                  <div className="mt-1 text-xs text-neutral-500">
                    {source.authority === "federal" ? "Федеральный" : "Региональный"} · {source.verificationStatus}
                  </div>
                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs text-blue-700 underline"
                    >
                      Открыть официальный источник
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            Любые изменения сохраняются отдельным черновиком в Neon. Действующая
            публичная маршрутизация не меняется напрямую и не зависит от
            незавершённых административных правок.
          </div>

          <AdminDrafts
            profileId={selectedProfile}
            currentVersion={document.contentVersion}
          />
        </section>
      </div>
    </div>
  );
}
