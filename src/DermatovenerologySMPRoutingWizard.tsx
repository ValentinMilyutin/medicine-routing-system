import { type ReactNode, useMemo, useState } from "react";
import {
  type Condition,
  type Facility,
  type FormState,
  type Source,
  TERRITORIES,
  CONDITION_LABELS,
  evaluateRouting,
} from "./routing/dermatology";

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

function FacilityCard(props: { facility: Facility; label: string }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
        {props.label}
      </div>
      <div className="mt-1 font-bold">{props.facility.name}</div>
      <div className="mt-1 text-sm text-neutral-700">{props.facility.role}</div>
      <div className="mt-2 text-sm font-medium">{props.facility.address}</div>
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

export default function DermatovenerologySMPRoutingWizard() {
  const [state, setState] = useState<FormState>({});
  const result = useMemo(() => evaluateRouting(state), [state]);

  const selectCondition = (condition: Condition) => {
    setState((current) => ({
      ...current,
      condition,
      inpatientCare: condition === "none" ? current.inpatientCare : undefined,
    }));
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-4">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">
            Дерматовенерология — маршрутизация СМП
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Территория и состояние пациента → место оказания помощи.
          </p>
        </header>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <Section title="1. Территория вызова">
              <label
                className="mb-1 block text-sm font-medium"
                htmlFor="derm-territory"
              >
                Муниципальный район или округ
              </label>
              <select
                id="derm-territory"
                className="w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2"
                value={state.territory ?? ""}
                onChange={(event) => {
                  const territory = event.currentTarget.value || undefined;
                  setState((current) => ({
                    ...current,
                    territory,
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

            <Section title="2. Состояние пациента">
              <p className="mb-3 text-sm text-neutral-600">
                Выберите состояние, которое определяет маршрут.
              </p>
              <div className="space-y-2">
                {(Object.keys(CONDITION_LABELS) as Condition[]).map(
                  (condition) => (
                    <ChoiceButton
                      key={condition}
                      selected={state.condition === condition}
                      onClick={() => selectCondition(condition)}
                    >
                      <span className="font-medium">
                        {CONDITION_LABELS[condition]}
                      </span>
                    </ChoiceButton>
                  ),
                )}
              </div>
            </Section>

            {state.condition === "none" ? (
              <Section title="3. Требуется ли стационарное лечение?">
                <p className="mb-3 text-sm text-neutral-600">
                  Амбулаторная помощь невозможна и есть показания к профильной
                  госпитализации?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <ChoiceButton
                    selected={state.inpatientCare === true}
                    onClick={() =>
                      setState((current) => ({
                        ...current,
                        inpatientCare: true,
                      }))
                    }
                  >
                    <span className="font-medium">Да</span>
                  </ChoiceButton>
                  <ChoiceButton
                    selected={state.inpatientCare === false}
                    onClick={() =>
                      setState((current) => ({
                        ...current,
                        inpatientCare: false,
                      }))
                    }
                  >
                    <span className="font-medium">Нет</span>
                  </ChoiceButton>
                </div>
              </Section>
            ) : null}

            <div className="rounded-3xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
              Осложнённые инфекции, передаваемые половым путём, маршрутизируются
              по профилю осложнения; новорождённые с врождённым сифилисом — в
              акушерский или детский стационар с привлечением дерматовенеролога;
              при подозрении на злокачественное новообразование — в первичный
              онкологический кабинет.
            </div>
          </div>

          <Section title="Итог маршрутизации">
            {!result ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Выберите территорию и состояние пациента. Если опасных состояний
                нет, также укажите, требуется ли стационарное лечение.
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
                  label="Куда направить пациента"
                />

                {result.afterStabilization ? (
                  <FacilityCard
                    facility={result.afterStabilization}
                    label="После стабилизации — при наличии показаний"
                  />
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
          Региональная схема перенесена из приказа № 98-Д от 01.02.2022. Перед
          использованием в рабочей системе её необходимо сверить с Минздравом
          Новгородской области с учётом действующего федерального приказа
          Минздрава России № 582н от 24.09.2025.
        </div>
      </div>
    </div>
  );
}
