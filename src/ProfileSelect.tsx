import React from "react";

export type ProfileKey = "obgyn" | "oncology";

export default function ProfileSelect(props: {
  onSelect: (profile: ProfileKey) => void;
}) {
  const { onSelect } = props;

  return (
    <div className="min-h-screen bg-neutral-50 p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="text-2xl font-bold">Маршрутизация СМП (MVP)</div>
          <div className="text-sm text-neutral-600 mt-1">
            Выберите профиль — дальше откроется соответствующий мастер/опросник.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            className="rounded-3xl border border-neutral-200 bg-white p-6 text-left shadow-sm hover:bg-neutral-50 transition"
            onClick={() => onSelect("obgyn")}
            type="button"
          >
            <div className="text-lg font-semibold">Акушерство / гинекология</div>
            <div className="text-sm text-neutral-600 mt-1">
              Опросник → сценарий → маршрутизация → обоснование
            </div>
          </button>

          <button
            className="rounded-3xl border border-neutral-200 bg-white p-6 text-left shadow-sm hover:bg-neutral-50 transition"
            onClick={() => onSelect("oncology")}
            type="button"
          >
            <div className="text-lg font-semibold">Онкология</div>
            <div className="text-sm text-neutral-600 mt-1">
              Территория → СМП → синдромы → итоговый маршрут
            </div>
          </button>
        </div>

        <div className="text-xs text-neutral-500">
          Примечание: сейчас это навигация внутри приложения. Позже можно заменить на нормальные URL через react-router. Кроме этого - это тестовая версия.
        </div>
      </div>
    </div>
  );
}