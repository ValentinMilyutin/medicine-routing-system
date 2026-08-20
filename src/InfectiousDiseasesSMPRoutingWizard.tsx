import { type ReactNode, useEffect, useMemo, useState } from "react";
import DynamicRoutingQuestionnaire from "./DynamicRoutingQuestionnaire";
import {
  type Facility,
  type Source,
  evaluateInfectiousRoutingRuleSet,
} from "./routing/infectious";
import { infectiousRoutingContent } from "./routing/content-manifests";
import {
  normalizeRoutingQuestionnaireState,
  routingRuleSetRegistry,
  unansweredRequiredRoutingQuestions,
  type RoutingQuestionnaireState,
} from "./routing";
import {
  loadPublishedInfectiousRoutingVersion,
  type PublishedRoutingVersion,
} from "./routing/published-content-api";

function Section(props: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-bold">{props.title}</h2>
      {props.children}
    </section>
  );
}

function FacilityCard(props: { facility: Facility; label: string }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
        {props.label}
      </div>
      <div className="mt-1 font-bold">{props.facility.name}</div>
      <div className="mt-1 text-sm text-neutral-700">{props.facility.role}</div>
      <div className="mt-2 text-sm font-medium">{props.facility.address}</div>
      {props.facility.url ? (
        <a
          className="mt-2 inline-block text-sm text-blue-700 underline underline-offset-2"
          href={props.facility.url}
          target="_blank"
          rel="noreferrer"
        >
          Официальный сайт медицинской организации
        </a>
      ) : null}
    </div>
  );
}

function ListBlock(props: { title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-1 text-sm font-semibold">{props.title}</div>
      <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">
        {props.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function SourceBlock(props: { sources: Source[] }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="mb-2 text-sm font-semibold">Нормативные источники</div>
      <ul className="list-disc space-y-2 pl-5 text-sm text-neutral-700">
        {props.sources.map((source) => (
          <li key={source.label}>
            {source.url ? (
              <a
                className="text-blue-700 underline underline-offset-2"
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                {source.label}
              </a>
            ) : (
              source.label
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function InfectiousDiseasesSMPRoutingWizard() {
  const [publishedVersion, setPublishedVersion] =
    useState<PublishedRoutingVersion | null>(null);
  const [publicationState, setPublicationState] = useState<
    "loading" | "published" | "fallback"
  >("loading");
  const [state, setState] = useState<RoutingQuestionnaireState>({
    lifeThreats: [],
    admissionCriteria: [],
  });
  const activeDocument = publishedVersion?.document ?? infectiousRoutingContent;
  const activeRuleSet =
    publishedVersion?.ruleSet ?? routingRuleSetRegistry["infectious.v1"];

  useEffect(() => {
    const controller = new AbortController();
    loadPublishedInfectiousRoutingVersion(controller.signal)
      .then((version) => {
        if (version) {
          setPublishedVersion(version);
          setState((current) =>
            normalizeRoutingQuestionnaireState(
              version.document.questions,
              current,
            ),
          );
          setPublicationState("published");
        } else {
          setPublicationState("fallback");
        }
      })
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) {
          setPublicationState("fallback");
        }
      });
    return () => controller.abort();
  }, []);

  const missingQuestions = unansweredRequiredRoutingQuestions(
    activeDocument.questions,
    state,
  );
  const result = useMemo(
    () =>
      missingQuestions.length === 0
        ? evaluateInfectiousRoutingRuleSet(activeRuleSet, state)
        : null,
    [activeRuleSet, missingQuestions.length, state],
  );

  return (
    <div className="min-h-screen bg-neutral-50 p-4">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">
            Инфекционные болезни — маршрутизация взрослых пациентов СМП
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Территория и состояние пациента → профильный стационар и этапы
            медицинской эвакуации.
          </p>
          <div className="mt-3 text-xs text-neutral-500">
            {publicationState === "published" && publishedVersion
              ? `Опубликованная версия ${publishedVersion.contentVersion}`
              : publicationState === "loading"
                ? "Проверка опубликованной версии…"
                : `Встроенная резервная версия ${activeDocument.contentVersion}`}
          </div>
        </header>

        {activeDocument.blockingCuratorQuestionIds.length > 0 ? (
          <div className="rounded-3xl border-2 border-violet-300 bg-violet-50 p-5 text-violet-950">
          <div className="text-sm font-bold uppercase tracking-wide text-violet-800">
            Вопрос для верификации куратором Минздрава
          </div>
          <p className="mt-2 text-sm">
            Приказ № 302-Д не закрепляет конкретное реанимационное отделение
            первого этапа за каждой территорией. Чтобы система всегда отвечала
            на вопрос «куда везти», нужна официальная таблица: территория →
            основная ОАРИТ → резервная ОАРИТ, с адресами, контактами для
            согласования и порядком переключения при недоступности стационара.
          </p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <DynamicRoutingQuestionnaire
              questions={activeDocument.questions}
              state={state}
              onChange={setState}
            />
          </div>

          <Section title="Итог маршрутизации">
            {!result ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                {missingQuestions.length > 0
                  ? `Для расчёта маршрута заполните: ${missingQuestions.map((question) => question.label).join(", ")}.`
                  : "Ни одна ветка не подошла к выбранным параметрам. Сообщите администратору о пробеле в логике."}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-xl font-bold">{result.title}</div>
                  <div className="mt-1 text-sm text-neutral-600">
                    Срочность: {result.urgency}
                  </div>
                  <div className="text-sm text-neutral-600">
                    Транспорт: {result.transport}
                  </div>
                </div>

                <FacilityCard
                  facility={result.target}
                  label={result.targetLabel}
                />

                {result.nextTarget && result.nextTargetLabel ? (
                  <FacilityCard
                    facility={result.nextTarget}
                    label={result.nextTargetLabel}
                  />
                ) : null}

                {result.referenceTargets &&
                result.referenceTargets.length > 0 &&
                result.referenceTargetsLabel
                  ? result.referenceTargets.map((facility) => (
                      <FacilityCard
                        key={facility.name}
                        facility={facility}
                        label={result.referenceTargetsLabel ?? "Справочно"}
                      />
                    ))
                  : null}

                {result.warning ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                    {result.warning}
                  </div>
                ) : null}

                <ListBlock title="Действия СМП" items={result.actions} />
                <ListBlock
                  title="Что передать принимающей стороне"
                  items={result.handoff}
                />
                <SourceBlock sources={result.sources} />
              </div>
            )}
          </Section>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950">
          Профиль предназначен только для взрослых. Территориальная схема
          общего инфекционного профиля перенесена из приказа № 302-Д от
          18.03.2022, а схема для гриппа, ОРВИ, внебольничной пневмонии и
          COVID-19 — из сезонного приказа № 920-Д от 28.08.2025. Приказы не
          указывают конкретный принимающий корпус и текущую доступность коек.
          Перед транспортировкой маршрут, корпус и адрес въезда обязательно
          подтверждаются диспетчером и принимающей стороной. Сезонный приказ
          2025–2026 годов необходимо проверить на замену новой схемой.
        </div>
      </div>
    </div>
  );
}
