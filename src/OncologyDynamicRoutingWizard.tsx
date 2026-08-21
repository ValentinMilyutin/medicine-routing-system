import { type ReactNode, useEffect, useMemo, useState } from "react";
import DynamicRoutingQuestionnaire from "./DynamicRoutingQuestionnaire";
import {
  loadPublishedRoutingVersion,
  routingRuleSetRegistry,
  unansweredRequiredRoutingQuestions,
  type PublishedRoutingVersion,
  type RoutingQuestionnaireState,
} from "./routing";
import { oncologyRoutingContent } from "./routing/content-manifests";
import { evaluateOncologyRoutingRuleSet } from "./routing/oncology";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function text(value: unknown): string { return typeof value === "string" ? value : ""; }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function Section(props: { title: string; children: ReactNode }) {
  return <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-lg font-bold">{props.title}</h2>{props.children}</section>;
}
function ListBlock(props: { title: string; items: string[] }) {
  if (props.items.length === 0) return null;
  return <div><div className="mb-1 text-sm font-semibold">{props.title}</div><ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">{props.items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></div>;
}

export default function OncologyDynamicRoutingWizard() {
  const [publishedVersion, setPublishedVersion] = useState<PublishedRoutingVersion | null>(null);
  const [publicationState, setPublicationState] = useState<"loading" | "published" | "fallback">("loading");
  const [state, setState] = useState<RoutingQuestionnaireState>({});
  const activeDocument = publishedVersion?.document ?? oncologyRoutingContent;
  const activeRuleSet = publishedVersion?.ruleSet ?? routingRuleSetRegistry["oncology.v1"];

  useEffect(() => {
    const controller = new AbortController();
    loadPublishedRoutingVersion("oncology", controller.signal)
      .then((version) => { setPublishedVersion(version); setPublicationState(version ? "published" : "fallback"); })
      .catch((reason: unknown) => { if (!(reason instanceof DOMException && reason.name === "AbortError")) setPublicationState("fallback"); });
    return () => controller.abort();
  }, []);

  const missing = unansweredRequiredRoutingQuestions(activeDocument.questions, state);
  const evaluation = useMemo(
    () => missing.length === 0 ? evaluateOncologyRoutingRuleSet(activeRuleSet, state) : null,
    [activeRuleSet, missing.length, state],
  );
  const result: Record<string, unknown> | null = evaluation && isRecord(evaluation.result)
    ? evaluation.result as Record<string, unknown>
    : null;
  const destination = result && isRecord(result.locationPrimaryHospital) ? result.locationPrimaryHospital : null;
  const ems = result && isRecord(result.ems) ? result.ems : null;
  const transportRequired = result ? !["plan_onco_referral", "no_hospitalization"].includes(text(result.route)) : false;

  return <div className="min-h-screen bg-neutral-50 p-4"><div className="mx-auto max-w-6xl space-y-4">
    <header className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold">Онкология — маршрутизация СМП</h1>
      <p className="mt-1 text-sm text-neutral-600">Территория, клинические признаки и потребность в перевозке → маршрут и медицинская организация.</p>
      <div className="mt-3 text-xs text-neutral-500">{publicationState === "published" && publishedVersion ? `Опубликованная версия ${publishedVersion.contentVersion}` : publicationState === "loading" ? "Проверка опубликованной версии…" : `Встроенная резервная версия ${activeDocument.contentVersion}`}</div>
    </header>
    {activeDocument.blockingCuratorQuestionIds.length > 0 ? <div className="rounded-3xl border-2 border-violet-300 bg-violet-50 p-5 text-sm text-violet-950"><b>Вопросы для куратора:</b> {activeDocument.blockingCuratorQuestionIds.join(", ")}. Не подтверждённые приказом оперативные назначения не подменяются предположениями.</div> : null}
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
      <DynamicRoutingQuestionnaire questions={activeDocument.questions} state={state} onChange={setState} />
      <Section title="Итог маршрутизации">
        {!result ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{missing.length > 0 ? `Для расчёта заполните: ${missing.map((question) => question.label).join(", ")}.` : "Ни одна ветка не определяет маршрут."}</div> : <div className="space-y-4">
          <div><div className="text-xs font-semibold uppercase text-emerald-700">Сработала ветка {evaluation?.ruleId}</div><div className="mt-1 text-xl font-bold">{text(result.routeTitle)}</div></div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><div className="text-xs font-semibold uppercase text-blue-700">Решение для бригады</div><div className="mt-1 font-medium">{text(result.target)}</div></div>
          {destination && transportRequired ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="text-xs font-semibold uppercase text-emerald-700">Медицинская организация</div><div className="mt-1 font-bold">{text(destination.name)}</div><div className="mt-2 text-sm font-medium">{text(destination.address)}</div></div> : null}
          <div className="text-sm"><b>Транспорт:</b> {text(result.transport)}</div>
          {ems ? <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-sm"><b>Обслуживающий контур СМП:</b> {text(ems.name)} — {text(ems.station)}</div> : null}
          <ListBlock title="Пояснения бригаде" items={strings(result.callouts)} />
          <ListBlock title="Неопределённости / требуется согласование" items={strings(result.uncertainties)} />
          <ListBlock title="Нормативные основания" items={strings(result.sources)} />
        </div>}
      </Section>
    </div>
  </div></div>;
}
