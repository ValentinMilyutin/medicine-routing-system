import { routingProfileList, type RoutingProfileId } from "./routing";

export default function ProfileSelect(props: {
  onSelect: (profile: RoutingProfileId) => void;
  onAdmin: () => void;
}) {
  return (
    <div className="min-h-screen bg-neutral-50 p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="text-2xl font-bold">Маршрутизация СМП (MVP)</div>
          <div className="text-sm text-neutral-600 mt-1">
            Выберите профиль — дальше откроется соответствующий мастер/опросник.
          </div>
        </div>

        <section
          aria-label="Профили маршрутизации"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {routingProfileList.map((profile) => (
            <button
              key={profile.id}
              className="rounded-3xl border border-neutral-200 bg-white p-6 text-left shadow-sm hover:bg-neutral-50 transition"
              onClick={() => props.onSelect(profile.id)}
              type="button"
            >
              <div className="text-lg font-semibold">{profile.title}</div>
              <div className="text-sm text-neutral-600 mt-1">
                {profile.description}
              </div>
            </button>
          ))}
        </section>

        <div className="flex flex-col gap-3 rounded-3xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium">Управление маршрутизацией</div>
            <div className="mt-1 text-xs text-neutral-500">
              Закрытый раздел для единственной учётной записи администратора.
            </div>
          </div>
          <button
            type="button"
            onClick={props.onAdmin}
            className="rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Администрирование
          </button>
        </div>
      </div>
    </div>
  );
}
