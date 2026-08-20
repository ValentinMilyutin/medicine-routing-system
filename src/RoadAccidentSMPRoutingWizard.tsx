import { type ReactNode, useMemo, useState } from "react";
import {
  type AgeGroup,
  type M11Responder,
  type M11Zone,
  type InjuryCriterion,
  type Facility,
  type FormState,
  TERRITORIES,
  AGE_LABELS,
  INJURY_LABELS,
  M11_RESPONDER_LABELS,
  M11_ZONES,
  evaluateRouting,
} from "./routing/road-accident";

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
      <div className="mt-1 text-sm text-neutral-700">
        Травмоцентр {props.facility.level} уровня. {props.facility.role}
      </div>
      <div className="mt-2 text-sm font-medium">{props.facility.address}</div>
    </div>
  );
}

function ListBlock(props: { title: string; items: string[] }) {
  if (props.items.length === 0) return null;
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

export default function RoadAccidentSMPRoutingWizard() {
  const [state, setState] = useState<FormState>({});
  const result = useMemo(() => evaluateRouting(state), [state]);

  const availableM11Zones = state.m11Responder
    ? M11_ZONES[state.m11Responder]
    : [];

  return (
    <div className="min-h-screen bg-neutral-50 p-4">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">
            ДТП и травма — маршрутизация пострадавших СМП
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Место ДТП, возраст и характер травмы → травмоцентр соответствующего уровня и этап медицинской эвакуации.
          </p>
        </header>

        <div className="rounded-3xl border-2 border-violet-300 bg-violet-50 p-5 text-violet-950">
          <div className="text-sm font-bold uppercase tracking-wide text-violet-800">
            Вопросы для верификации куратором Минздрава
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            <li>
              Предоставить действующую редакцию связанного приказа № 1359-Д от 21.11.2023 и подтвердить, что приказ № 1360-Д не заменён.
            </li>
            <li>
              Уточнить возраст для Валдайского ММЦ: приложение № 6 по М-11 включает подростков старше 15 лет, приложение № 7 содержит ограничение «только с 18 лет».
            </li>
            <li>
              Подтвердить адреса принимающих отделений, телефоны согласования, резервные травмоцентры и порядок переключения при недоступности стационара.
            </li>
          </ul>
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <Section title="1. Место дорожно-транспортного происшествия">
              <div className="space-y-2">
                <ChoiceButton
                  selected={state.locationKind === "territory"}
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      locationKind: "territory",
                      m10Zone: undefined,
                      m11Responder: undefined,
                      m11Zone: undefined,
                    }))
                  }
                >
                  <span className="font-medium">Муниципальная территория или другая дорога</span>
                </ChoiceButton>
                <ChoiceButton
                  selected={state.locationKind === "m10"}
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      locationKind: "m10",
                      territory: undefined,
                      m11Responder: undefined,
                      m11Zone: undefined,
                    }))
                  }
                >
                  <span className="font-medium">Федеральная дорога М-10 «Россия»</span>
                </ChoiceButton>
                <ChoiceButton
                  selected={state.locationKind === "m11"}
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      locationKind: "m11",
                      territory: undefined,
                      m10Zone: undefined,
                    }))
                  }
                >
                  <span className="font-medium">Федеральная дорога М-11 «Нева»</span>
                </ChoiceButton>
              </div>

              {state.locationKind === "territory" ? (
                <div className="mt-4">
                  <label className="mb-1 block text-sm font-medium" htmlFor="dtp-territory">
                    Район или округ
                  </label>
                  <select
                    id="dtp-territory"
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
                </div>
              ) : null}

              {state.locationKind === "m10" ? (
                <div className="mt-4 space-y-2">
                  <ChoiceButton
                    selected={state.m10Zone === "valdai_kresttsy"}
                    onClick={() =>
                      setState((current) => ({ ...current, m10Zone: "valdai_kresttsy" }))
                    }
                  >
                    <span className="font-medium">Валдайский район и Крестецкий район до н. п. Зайцево</span>
                  </ChoiceButton>
                  <ChoiceButton
                    selected={state.m10Zone === "zaytsevo_novgorod_chudovo"}
                    onClick={() =>
                      setState((current) => ({ ...current, m10Zone: "zaytsevo_novgorod_chudovo" }))
                    }
                  >
                    <span className="font-medium">От н. п. Зайцево через Новгородский и Чудовский районы</span>
                  </ChoiceButton>
                </div>
              ) : null}

              {state.locationKind === "m11" ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium" htmlFor="dtp-m11-responder">
                      Ответственная организация/бригада
                    </label>
                    <select
                      id="dtp-m11-responder"
                      className="w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2"
                      value={state.m11Responder ?? ""}
                      onChange={(event) => {
                        const responder = event.currentTarget.value as M11Responder | "";
                        const zones = responder ? M11_ZONES[responder] : [];
                        setState((current) => ({
                          ...current,
                          m11Responder: responder || undefined,
                          m11Zone: zones.length === 1 ? zones[0].value : undefined,
                        }));
                      }}
                    >
                      <option value="">Выберите организацию</option>
                      {(Object.keys(M11_RESPONDER_LABELS) as M11Responder[]).map((responder) => (
                        <option key={responder} value={responder}>
                          {M11_RESPONDER_LABELS[responder]}
                        </option>
                      ))}
                    </select>
                  </div>
                  {availableM11Zones.length > 0 ? (
                    <div>
                      <label className="mb-1 block text-sm font-medium" htmlFor="dtp-m11-zone">
                        Километровый участок
                      </label>
                      <select
                        id="dtp-m11-zone"
                        className="w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2"
                        value={state.m11Zone ?? ""}
                        onChange={(event) => {
                          const zone = event.currentTarget.value as M11Zone | "";
                          setState((current) => ({
                            ...current,
                            m11Zone: zone || undefined,
                          }));
                        }}
                      >
                        <option value="">Выберите участок</option>
                        {availableM11Zones.map((zone) => (
                          <option key={zone.value} value={zone.value}>
                            {zone.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Section>

            <Section title="2. Возраст пострадавшего">
              <div className="space-y-2">
                {(Object.keys(AGE_LABELS) as AgeGroup[]).map((ageGroup) => (
                  <ChoiceButton
                    key={ageGroup}
                    selected={state.ageGroup === ageGroup}
                    onClick={() => setState((current) => ({ ...current, ageGroup }))}
                  >
                    <span className="font-medium">{AGE_LABELS[ageGroup]}</span>
                  </ChoiceButton>
                ))}
              </div>
            </Section>

            <Section title="3. Ведущий критерий маршрутизации">
              <p className="mb-3 text-sm text-neutral-600">
                Выберите наиболее тяжёлый или наиболее срочный из выявленных критериев.
              </p>
              <div className="space-y-2">
                {(Object.keys(INJURY_LABELS) as InjuryCriterion[]).map((criterion) => (
                  <ChoiceButton
                    key={criterion}
                    selected={state.injuryCriterion === criterion}
                    onClick={() =>
                      setState((current) => ({ ...current, injuryCriterion: criterion }))
                    }
                  >
                    <span className="font-medium">{INJURY_LABELS[criterion]}</span>
                  </ChoiceButton>
                ))}
              </div>
            </Section>
          </div>

          <Section title="Итог маршрутизации">
            {!result ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Укажите место ДТП, возраст пострадавшего и ведущий критерий травмы. Для М-11 дополнительно выберите ответственную организацию и километровый участок.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-xl font-bold">{result.title}</div>
                  <div className="mt-1 text-sm text-neutral-600">
                    Срочность: {result.urgency}
                  </div>
                </div>

                <FacilityCard facility={result.target} label={result.targetLabel} />
                {result.nextTarget && result.nextTargetLabel ? (
                  <FacilityCard facility={result.nextTarget} label={result.nextTargetLabel} />
                ) : null}

                <ListBlock title="Почему выбран этот маршрут" items={result.rationale} />
                <ListBlock title="Действия СМП" items={result.actions} />
                <ListBlock title="Что передать принимающей стороне" items={result.handoff} />

                {result.warnings.map((warning) => (
                  <div
                    key={warning}
                    className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
                  >
                    {warning}
                  </div>
                ))}

                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="mb-1 text-sm font-semibold">Нормативный источник</div>
                  <div className="text-sm text-neutral-700">{result.sourceReference}</div>
                </div>
              </div>
            )}
          </Section>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950">
          Система показывает нормативный маршрут, но не знает текущую загрузку травмоцентров, состояние дорог и готовность принимающей бригады. Перед выездом маршрут, принимающее отделение, адрес въезда и необходимость специализированной эвакуации обязательно подтверждаются диспетчером и принимающей медицинской организацией.
        </div>
      </div>
    </div>
  );
}
