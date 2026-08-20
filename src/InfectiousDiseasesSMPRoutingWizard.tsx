import { type ReactNode, useMemo, useState } from "react";
import {
  type InfectionGroup,
  type LifeThreat,
  type AnyAdmissionCriterion,
  type Facility,
  type Source,
  type FormState,
  INFECTION_GROUP_LABELS,
  TERRITORIES,
  LIFE_THREAT_LABELS,
  admissionLabelsFor,
  evaluateRouting,
} from "./routing/infectious";

function Section(props: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-bold">{props.title}</h2>
      {props.children}
    </section>
  );
}

function ChoiceButton(props: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`w-full rounded-2xl border p-3 text-left transition ${
        props.selected
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-200 bg-white hover:bg-neutral-50"
      }`}
    >
      {props.children}
    </button>
  );
}

function CheckboxChoice(props: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-2xl border border-neutral-200 p-3 hover:bg-neutral-50">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0"
        checked={props.checked}
        onChange={props.onChange}
      />
      <span className="text-sm font-medium">{props.label}</span>
    </label>
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
  const [state, setState] = useState<FormState>({
    lifeThreats: [],
    admissionCriteria: [],
  });
  const result = useMemo(() => evaluateRouting(state), [state]);

  const toggleLifeThreat = (item: LifeThreat) => {
    setState((current) => {
      if (item === "none") {
        return {
          ...current,
          lifeThreats: ["none"],
          admissionCriteria: [],
          transportable: undefined,
        };
      }

      const withoutNone = current.lifeThreats.filter(
        (selected) => selected !== "none",
      );
      const selected = withoutNone.includes(item)
        ? withoutNone.filter((value) => value !== item)
        : [...withoutNone, item];

      return {
        ...current,
        lifeThreats: selected,
        admissionCriteria: [],
        transportable: undefined,
      };
    });
  };

  const toggleAdmissionCriterion = (item: AnyAdmissionCriterion) => {
    setState((current) => {
      if (item === "none") {
        return {
          ...current,
          admissionCriteria: ["none"],
          transportable: undefined,
        };
      }

      const withoutNone = current.admissionCriteria.filter(
        (selected) => selected !== "none",
      );
      const selected = withoutNone.includes(item)
        ? withoutNone.filter((value) => value !== item)
        : [...withoutNone, item];

      return {
        ...current,
        admissionCriteria: selected,
        transportable: selected.includes("severe")
          ? current.transportable
          : undefined,
      };
    });
  };

  const hasLifeThreat = state.lifeThreats.some((item) => item !== "none");
  const admissionLabels = admissionLabelsFor(state.infectionGroup);
  const needsTransportability =
    state.infectionGroup === "general" &&
    state.admissionCriteria.includes("severe");

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
        </header>

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

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <Section title="1. Территория вызова">
              <label
                className="mb-1 block text-sm font-medium"
                htmlFor="infection-territory"
              >
                Муниципальный район или округ
              </label>
              <select
                id="infection-territory"
                className="w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2"
                value={state.territory ?? ""}
                onChange={(event) => {
                  const territory = event.currentTarget.value;
                  setState((current) => ({
                    ...current,
                    territory: territory || undefined,
                  }));
                }}
              >
                <option value="">Выберите территорию</option>
                {TERRITORIES.map((territory) => (
                  <option key={territory.name} value={territory.name}>
                    {territory.name}
                  </option>
                ))}
              </select>
            </Section>

            <Section title="2. Группа инфекционного заболевания">
              <p className="mb-3 text-sm text-neutral-600">
                Отдельная сезонная схема действует только для перечисленных
                респираторных инфекций. Для остальных применяется общий
                инфекционный маршрут.
              </p>
              <div className="space-y-2">
                {(Object.keys(INFECTION_GROUP_LABELS) as InfectionGroup[]).map(
                  (item) => (
                    <ChoiceButton
                      key={item}
                      selected={state.infectionGroup === item}
                      onClick={() =>
                        setState((current) => ({
                          ...current,
                          infectionGroup: item,
                          lifeThreats: [],
                          admissionCriteria: [],
                          transportable: undefined,
                        }))
                      }
                    >
                      <span className="font-medium">
                        {INFECTION_GROUP_LABELS[item]}
                      </span>
                    </ChoiceButton>
                  ),
                )}
              </div>
            </Section>

            <Section title="3. Жизнеугрожающие состояния">
              <p className="mb-3 text-sm text-neutral-600">
                Отметьте все выявленные признаки или укажите, что их нет.
              </p>
              <div className="space-y-2">
                {(Object.keys(LIFE_THREAT_LABELS) as LifeThreat[]).map(
                  (item) => (
                    <CheckboxChoice
                      key={item}
                      checked={state.lifeThreats.includes(item)}
                      onChange={() => toggleLifeThreat(item)}
                      label={LIFE_THREAT_LABELS[item]}
                    />
                  ),
                )}
              </div>
            </Section>

            {state.lifeThreats.includes("none") ? (
              <Section title="4. Показания к стационарному лечению">
                <p className="mb-3 text-sm text-neutral-600">
                  Отметьте все подходящие критерии. При отсутствии показаний
                  выберите последний вариант.
                </p>
                <div className="space-y-2">
                  {(Object.keys(admissionLabels) as AnyAdmissionCriterion[]).map(
                    (item) => (
                    <CheckboxChoice
                      key={item}
                      checked={state.admissionCriteria.includes(item)}
                      onChange={() => toggleAdmissionCriterion(item)}
                      label={admissionLabels[item]}
                    />
                    ),
                  )}
                </div>
              </Section>
            ) : null}

            {!hasLifeThreat && needsTransportability ? (
              <Section title="5. Транспортабельность">
                <p className="mb-3 text-sm text-neutral-600">
                  Позволяет ли состояние выполнить прямую транспортировку в
                  областной инфекционный стационар?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <ChoiceButton
                    selected={state.transportable === true}
                    onClick={() =>
                      setState((current) => ({
                        ...current,
                        transportable: true,
                      }))
                    }
                  >
                    <span className="font-medium">Да</span>
                  </ChoiceButton>
                  <ChoiceButton
                    selected={state.transportable === false}
                    onClick={() =>
                      setState((current) => ({
                        ...current,
                        transportable: false,
                      }))
                    }
                  >
                    <span className="font-medium">Нет</span>
                  </ChoiceButton>
                </div>
              </Section>
            ) : null}
          </div>

          <Section title="Итог маршрутизации">
            {!result ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Выберите территорию и группу инфекционного заболевания, затем
                оцените жизнеугрожающие состояния. Если их нет — укажите
                показания к стационарному лечению.
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
