import { type ReactNode, useEffect, useMemo, useState } from "react";
import DynamicRoutingQuestionnaire from "./DynamicRoutingQuestionnaire";
import {
  loadPublishedRoutingVersion,
  routingRuleSetRegistry,
  unansweredRequiredRoutingQuestions,
  type PublishedRoutingVersion,
  type RoutingQuestionnaireState,
} from "./routing";
import { dermatologyRoutingContent } from "./routing/content-manifests";
import {
  evaluateDermatologyRoutingRuleSet,
  type Facility,
} from "./routing/dermatology";
import { useRoutingTelemetry } from "./operations/use-routing-telemetry";

function Section(props: { title: string; children: ReactNode }) {
  return <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-lg font-bold">{props.title}</h2>{props.children}</section>;
}

function FacilityCard(props: { facility: Facility; label: string }) {
  return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{props.label}</div><div className="mt-1 font-bold">{props.facility.name}</div><div className="mt-1 text-sm text-neutral-700">{props.facility.role}</div><div className="mt-2 text-sm font-medium">{props.facility.address}</div></div>;
}

function ListBlock(props: { title: string; items: string[] }) {
  if (props.items.length === 0) return null;
  return <div><div className="mb-1 text-sm font-semibold">{props.title}</div><ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">{props.items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></div>;
}

export default function DermatologyDynamicRoutingWizard() {
  const [publishedVersion, setPublishedVersion] = useState<PublishedRoutingVersion | null>(null);
  const [publicationState, setPublicationState] = useState<"loading" | "published" | "fallback">("loading");
  const [state, setState] = useState<RoutingQuestionnaireState>({});
  const activeDocument = publishedVersion?.document ?? dermatologyRoutingContent;
  const activeRuleSet = publishedVersion?.ruleSet ?? routingRuleSetRegistry["dermatology.v1"];

  useEffect(() => {
    const controller = new AbortController();
    loadPublishedRoutingVersion("dermatology", controller.signal)
      .then((version) => { setPublishedVersion(version); setPublicationState(version ? "published" : "fallback"); })
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) setPublicationState("fallback");
      });
    return () => controller.abort();
  }, []);

  const missing = unansweredRequiredRoutingQuestions(activeDocument.questions, state);
  const result = useMemo(
    () => missing.length === 0 ? evaluateDermatologyRoutingRuleSet(activeRuleSet, state) : null,
    [activeRuleSet, missing.length, state],
  );
  useRoutingTelemetry({ profileId: "dermatology", contentVersion: activeDocument.contentVersion, resultId: result?.title });

  return (
    <div className="min-h-screen bg-neutral-50 p-4">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Дерматовенерология — маршрутизация СМП</h1>
          <p className="mt-1 text-sm text-neutral-600">Территория и состояние → медицинская организация и адрес.</p>
          <div className="mt-3 text-xs text-neutral-500">{publicationState === "published" && publishedVersion ? `Опубликованная версия ${publishedVersion.contentVersion}` : publicationState === "loading" ? "Проверка опубликованной версии…" : `Встроенная резервная версия ${activeDocument.contentVersion}`}</div>
        </header>
        {activeDocument.blockingCuratorQuestionIds.length > 0 ? <div className="rounded-3xl border-2 border-violet-300 bg-violet-50 p-5 text-sm text-violet-950"><b>Вопросы для куратора:</b> {activeDocument.blockingCuratorQuestionIds.join(", ")}. Спорные оперативные назначения требуют официального подтверждения.</div> : null}
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <DynamicRoutingQuestionnaire questions={activeDocument.questions} state={state} onChange={setState} />
          <Section title="Итог маршрутизации">
            {!result ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{missing.length > 0 ? `Для расчёта заполните: ${missing.map((question) => question.label).join(", ")}.` : "Ни одна ветка не подошла."}</div> : (
              <div className="space-y-4">
                <div><div className="text-xl font-bold">{result.title}</div><div className="mt-1 text-sm text-neutral-600">Срочность: {result.urgency}</div><div className="text-sm text-neutral-600">Транспорт: {result.transport}</div></div>
                <FacilityCard facility={result.target} label="Куда направить пациента" />
                {result.afterStabilization ? <FacilityCard facility={result.afterStabilization} label="После стабилизации" /> : null}
                <ListBlock title="Действия СМП" items={result.actions} />
                <ListBlock title="Что передать принимающей стороне" items={result.handoff} />
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"><div className="text-sm font-semibold">Нормативные источники</div><ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-neutral-600">{result.sources.map((source) => <li key={source.label}>{source.url ? <a href={source.url} target="_blank" rel="noreferrer" className="text-blue-700 underline">{source.label}</a> : source.label}</li>)}</ul></div>
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
