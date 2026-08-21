import { compareRoutingVersions } from "../routing";
import type {
  EffectiveRoutingVersion,
  StoredRoutingVersion,
} from "./admin-content-api";

const CATEGORY_LABELS = {
  routing: "Маршруты и логика",
  questions: "Вопросы",
  sources: "Источники",
  text: "Пояснения",
} as const;

const KIND_LABELS = {
  added: "+ Добавлено",
  removed: "− Удалено",
  changed: "~ Изменено",
} as const;

export default function RoutingVersionComparison(props: {
  current: EffectiveRoutingVersion;
  candidate: StoredRoutingVersion;
}) {
  const diff = compareRoutingVersions(
    props.current.document,
    props.current.ruleSet,
    props.candidate.document,
    props.candidate.ruleSet,
  );

  return (
    <section className="space-y-3 rounded-2xl border border-violet-200 bg-violet-50/40 p-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">
          Отличия от текущей рабочей версии
        </div>
        <h4 className="mt-1 font-semibold">
          {props.candidate.contentVersion} относительно {props.current.contentVersion}
        </h4>
      </div>

      {diff.total === 0 ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Вопросы, логика маршрутов и источники совпадают с текущей версией.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map(
              (category) => (
                <div key={category} className="rounded-xl border border-neutral-200 bg-white p-3">
                  <div className="text-lg font-semibold">{diff.counts[category]}</div>
                  <div className="text-xs text-neutral-500">{CATEGORY_LABELS[category]}</div>
                </div>
              ),
            )}
          </div>

          {diff.highImpactCount > 0 ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Существенных изменений, способных повлиять на опросник или конечный
              маршрут: {diff.highImpactCount}.
            </div>
          ) : null}

          <div className="space-y-2">
            {diff.changes.map((change) => (
              <details key={change.id} className="rounded-xl border border-neutral-200 bg-white p-3">
                <summary className="cursor-pointer list-none">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{change.title}</div>
                      <div className="mt-1 text-xs text-neutral-500">
                        {change.description}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-xs ${
                        change.impact === "high"
                          ? "bg-red-100 text-red-800"
                          : change.impact === "medium"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {KIND_LABELS[change.kind]}
                    </span>
                  </div>
                </summary>
                {change.before || change.after ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg bg-neutral-50 p-3 text-xs">
                      <div className="mb-1 font-semibold text-neutral-500">Было</div>
                      <div className="break-words">{change.before ?? "Отсутствовало"}</div>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-3 text-xs">
                      <div className="mb-1 font-semibold text-emerald-700">Стало</div>
                      <div className="break-words">{change.after ?? "Удалено"}</div>
                    </div>
                  </div>
                ) : null}
              </details>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
