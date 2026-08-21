import { type ReactNode, useEffect, useMemo, useState } from "react";
import DynamicRoutingQuestionnaire from "./DynamicRoutingQuestionnaire";
import { bskRoutingContent } from "./routing/content-manifests";
import {
  loadPublishedRoutingVersion,
  routingRuleSetRegistry,
  unansweredRequiredRoutingQuestions,
  type PublishedRoutingVersion,
  type RoutingQuestionnaireState,
} from "./routing";
import { evaluateBskRoutingRuleSet, type Facility } from "./routing/bsk";

function Section(props: { title: string; children: ReactNode }) {
  return <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-lg font-bold">{props.title}</h2>{props.children}</section>;
}
function FacilityCard(props: { facility: Facility; label: string }) {
  return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="text-xs font-semibold uppercase text-emerald-700">{props.label}</div><div className="mt-1 font-bold">{props.facility.name}</div><div className="mt-1 text-sm text-neutral-700">{props.facility.role}</div>{props.facility.address ? <div className="mt-2 text-sm font-medium">{props.facility.address}</div> : null}</div>;
}
function ListBlock(props: { title: string; items: string[] }) {
  if (props.items.length === 0) return null;
  return <div><div className="mb-1 text-sm font-semibold">{props.title}</div><ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">{props.items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></div>;
}

export default function BSKDynamicRoutingWizard() {
  const [publishedVersion, setPublishedVersion] = useState<PublishedRoutingVersion | null>(null);
  const [publicationState, setPublicationState] = useState<"loading" | "published" | "fallback">("loading");
  const [state, setState] = useState<RoutingQuestionnaireState>({});
  const activeDocument = publishedVersion?.document ?? bskRoutingContent;
  const activeRuleSet = publishedVersion?.ruleSet ?? routingRuleSetRegistry["bsk.v1"];
  useEffect(() => {
    const controller = new AbortController();
    loadPublishedRoutingVersion("bsk", controller.signal)
      .then((version) => { setPublishedVersion(version); setPublicationState(version ? "published" : "fallback"); })
      .catch((reason: unknown) => { if (!(reason instanceof DOMException && reason.name === "AbortError")) setPublicationState("fallback"); });
    return () => controller.abort();
  }, []);
  const missing = unansweredRequiredRoutingQuestions(activeDocument.questions, state);
  const result = useMemo(() => missing.length === 0 ? evaluateBskRoutingRuleSet(activeRuleSet, state) : null, [activeRuleSet, missing.length, state]);
  return (
    <div className="min-h-screen bg-neutral-50 p-4"><div className="mx-auto max-w-6xl space-y-4">
      <header className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"><h1 className="text-2xl font-bold">БСК / ССЗ: маршрутизация пациентов для СМП</h1><p className="mt-2 text-sm text-neutral-600">Территория и клинические критерии → конкретная принимающая медицинская организация.</p><div className="mt-3 text-xs text-neutral-500">{publicationState === "published" && publishedVersion ? `Опубликованная версия ${publishedVersion.contentVersion}` : publicationState === "loading" ? "Проверка опубликованной версии…" : `Встроенная резервная версия ${activeDocument.contentVersion}`}</div></header>
      {activeDocument.blockingCuratorQuestionIds.length > 0 ? <div className="rounded-3xl border-2 border-violet-300 bg-violet-50 p-5 text-sm text-violet-950"><b>Вопросы для куратора:</b> {activeDocument.blockingCuratorQuestionIds.join(", ")}.</div> : null}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <DynamicRoutingQuestionnaire questions={activeDocument.questions} state={state} onChange={setState} />
        <Section title="Итог маршрутизации">{!result ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{missing.length > 0 ? `Для расчёта заполните: ${missing.map((question) => question.label).join(", ")}.` : "Ни одна ветка не определяет маршрут."}</div> : <div className="space-y-4"><div><div className="text-xl font-bold">{result.title}</div><div className="mt-1 text-sm text-neutral-600">Срочность: {result.urgency}</div><div className="text-sm text-neutral-600">Транспорт: {result.transport}</div></div><FacilityCard facility={result.target} label="Куда везти пациента" />{result.alternative ? <FacilityCard facility={result.alternative} label="Дополнительный ориентир или следующий этап" /> : null}<ListBlock title="Кого предупредить" items={result.notify} /><ListBlock title="Чек-лист СМП" items={result.checklist} /><ListBlock title="Что передать принимающей стороне" items={result.handoff} /><ListBlock title="Нормативные основания" items={result.sources} /><ListBlock title="Требует врачебной сверки" items={result.warnings} /></div>}</Section>
      </div>
    </div></div>
  );
}
