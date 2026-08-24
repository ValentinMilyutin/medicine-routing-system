import { useEffect, useMemo, useState } from "react";
import { listAdminStats } from "../operations/operations-api";
import type { UsageEventType, UsageStat } from "../operations/types";
import { routingProfileList } from "../routing";

const eventLabels: Record<UsageEventType, string> = {
  profile_opened: "Открытия профиля",
  route_completed: "Завершённые маршруты",
  document_opened: "Открытия документов",
  feedback_submitted: "Обращения",
};

export default function AdminStats() {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<UsageStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    listAdminStats(days)
      .then((rows) => active && setStats(rows))
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : "Не удалось загрузить статистику."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [days]);

  const eventTotals = useMemo(() => {
    const totals = new Map<UsageEventType, number>();
    for (const row of stats) totals.set(row.eventType, (totals.get(row.eventType) ?? 0) + row.eventCount);
    return totals;
  }, [stats]);

  const profileTotals = useMemo(
    () => routingProfileList.map((profile) => ({
      ...profile,
      opened: stats.filter((row) => row.profileId === profile.id && row.eventType === "profile_opened").reduce((sum, row) => sum + row.eventCount, 0),
      completed: stats.filter((row) => row.profileId === profile.id && row.eventType === "route_completed").reduce((sum, row) => sum + row.eventCount, 0),
    })),
    [stats],
  );

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Обезличенная статистика</h2>
            <p className="mt-1 max-w-3xl text-sm text-neutral-600">
              Сохраняются только дата, профиль, версия, тип события и агрегированное количество. Ответы врача, данные пациента, IP-адреса и идентификаторы устройства в нашу базу не записываются.
            </p>
          </div>
          <select value={days} onChange={(event) => { setLoading(true); setError(""); setDays(Number(event.target.value)); }} className="rounded-2xl border border-neutral-300 px-3 py-2 text-sm">
            <option value={7}>7 дней</option>
            <option value={30}>30 дней</option>
            <option value={90}>90 дней</option>
            <option value={365}>365 дней</option>
          </select>
        </div>
        {error && <div role="alert" className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(eventLabels) as UsageEventType[]).map((eventType) => (
          <div key={eventType} className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-neutral-500">{eventLabels[eventType]}</div>
            <div className="mt-2 text-3xl font-bold">{loading ? "…" : (eventTotals.get(eventType) ?? 0).toLocaleString("ru-RU")}</div>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="p-5"><h3 className="font-semibold">Использование по профилям</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-5 py-3">Профиль</th><th className="px-5 py-3">Открытия</th><th className="px-5 py-3">Завершённые маршруты</th><th className="px-5 py-3">Доля завершения</th></tr></thead>
            <tbody>
              {profileTotals.map((profile) => (
                <tr key={profile.id} className="border-t border-neutral-100">
                  <td className="px-5 py-3 font-medium">{profile.title}</td>
                  <td className="px-5 py-3">{profile.opened}</td>
                  <td className="px-5 py-3">{profile.completed}</td>
                  <td className="px-5 py-3">{profile.opened > 0 ? `${Math.round((profile.completed / profile.opened) * 100)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
