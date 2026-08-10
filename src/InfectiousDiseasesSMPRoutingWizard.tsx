import { type ReactNode, useMemo, useState } from "react";

type RouteGroup = "direct" | "pestovo" | "borovichi" | "staraya_russa";

type LifeThreat =
  | "infectious_toxic_shock"
  | "hypovolemic_shock"
  | "cerebral_edema"
  | "renal_failure"
  | "hepatic_failure"
  | "cardiovascular_failure"
  | "respiratory_failure"
  | "none";

type AdmissionCriterion =
  | "severe"
  | "moderate"
  | "diagnosis_unavailable"
  | "differential_diagnostics"
  | "no_outpatient_effect"
  | "epidemiological"
  | "unclear_infectious_diagnosis"
  | "none";

type Facility = {
  name: string;
  role: string;
  address: string;
};

type Territory = {
  name: string;
  routeGroup: RouteGroup;
};

type Source = {
  label: string;
  url?: string;
};

type FormState = {
  territory?: string;
  lifeThreats: LifeThreat[];
  admissionCriteria: AdmissionCriterion[];
  transportable?: boolean;
};

type RoutingResult = {
  title: string;
  target: Facility;
  targetLabel: string;
  nextTarget?: Facility;
  nextTargetLabel?: string;
  urgency: string;
  transport: string;
  actions: string[];
  handoff: string[];
  sources: Source[];
  warning?: string;
};

const FEDERAL_ADULT_ORDER_URL =
  "https://publication.pravo.gov.ru/document/0001202509230019";
const EMERGENCY_CARE_ORDER_URL =
  "https://minzdrav.gov.ru/ministry/61/3/stranitsa-992/prikaz-minzdrava-rossii-ot-20-06-2013-n-388n-red-ot-21-02-2020-ob-utverzhdenii-poryadka-okazaniya-skoroy-v-tom-chisle-skoroy-spetsializirovannoy-meditsinskoy-pomoschi";

const REGIONAL_ORDER: Source = {
  label:
    "Приказ Министерства здравоохранения Новгородской области от 18.03.2022 № 302-Д «Об утверждении Порядка оказания медицинской помощи больным инфекционными заболеваниями в медицинских организациях Новгородской области»",
};

const FACILITIES = {
  nearestIcu: {
    name: "Ближайшая доступная медицинская организация с реанимационным отделением",
    role: "Стабилизация жизнеугрожающего состояния с соблюдением санитарно-противоэпидемического режима",
    address:
      "Организацию и адрес определяет диспетчер после подтверждения готовности принимающего стационара",
  },
  noib: {
    name: "ГОБУЗ «Новгородская областная инфекционная больница»",
    role: "Профильный инфекционный стационар областного уровня",
    address: "Великий Новгород, ул. Тимура Фрунзе-Оловянка, д. 21",
  },
  borovichi: {
    name: "ГОБУЗ «Боровичская центральная районная больница»",
    role: "Территориальный инфекционный стационар",
    address: "г. Боровичи, пл. 1 Мая, д. 2А",
  },
  starayaRussa: {
    name: "ГОБУЗ «Старорусская центральная районная больница»",
    role: "Территориальный инфекционный стационар",
    address: "г. Старая Русса, ул. Гостинодворская, д. 50",
  },
  pestovo: {
    name: "ГОБУЗ «Пестовская центральная районная больница»",
    role: "Территориальный инфекционный стационар",
    address: "г. Пестово, ул. Курганная, д. 18",
  },
  outpatient: {
    name: "Территориальная медицинская организация по месту вызова",
    role: "Амбулаторная помощь и динамическое наблюдение с разделением потоков пациентов",
    address:
      "Госпитализация по выбранным критериям не показана; передайте пациента под наблюдение территориальной медицинской организации",
  },
} satisfies Record<string, Facility>;

const TERRITORIES: Territory[] = [
  { name: "Великий Новгород", routeGroup: "direct" },
  { name: "Батецкий район", routeGroup: "direct" },
  { name: "Боровичский район", routeGroup: "borovichi" },
  { name: "Валдайский район", routeGroup: "direct" },
  { name: "Волотовский округ", routeGroup: "staraya_russa" },
  { name: "Демянский район", routeGroup: "staraya_russa" },
  { name: "Крестецкий район", routeGroup: "direct" },
  { name: "Любытинский район", routeGroup: "borovichi" },
  { name: "Маловишерский район", routeGroup: "direct" },
  { name: "Марёвский округ", routeGroup: "staraya_russa" },
  { name: "Мошенской район", routeGroup: "borovichi" },
  { name: "Новгородский район", routeGroup: "direct" },
  { name: "Окуловский район", routeGroup: "borovichi" },
  { name: "Парфинский район", routeGroup: "staraya_russa" },
  { name: "Пестовский район", routeGroup: "pestovo" },
  { name: "Поддорский район", routeGroup: "staraya_russa" },
  { name: "Солецкий округ", routeGroup: "direct" },
  { name: "Старорусский район", routeGroup: "staraya_russa" },
  { name: "Хвойнинский округ", routeGroup: "borovichi" },
  { name: "Холмский район", routeGroup: "staraya_russa" },
  { name: "Чудовский район", routeGroup: "direct" },
  { name: "Шимский район", routeGroup: "direct" },
];

const LIFE_THREAT_LABELS: Record<LifeThreat, string> = {
  infectious_toxic_shock: "Инфекционно-токсический шок",
  hypovolemic_shock: "Гиповолемический шок",
  cerebral_edema: "Отёк-набухание головного мозга",
  renal_failure: "Острая почечная недостаточность",
  hepatic_failure: "Острая печёночная недостаточность",
  cardiovascular_failure: "Острая сердечно-сосудистая недостаточность",
  respiratory_failure: "Острая дыхательная недостаточность",
  none: "Перечисленных жизнеугрожающих состояний нет",
};

const ADMISSION_LABELS: Record<AdmissionCriterion, string> = {
  severe: "Тяжёлое течение инфекционного заболевания",
  moderate: "Среднетяжёлое течение, требующее стационарного лечения",
  diagnosis_unavailable:
    "Невозможно установить диагноз в амбулаторных условиях",
  differential_diagnostics:
    "Нужны лабораторные или инструментальные исследования для дифференциальной диагностики",
  no_outpatient_effect:
    "Нет клинического эффекта от проводимой амбулаторной терапии",
  epidemiological:
    "Лёгкое течение, но имеются эпидемиологические показания к госпитализации",
  unclear_infectious_diagnosis:
    "Диагноз неясен, но симптомы или отклонения позволяют подозревать инфекционное заболевание",
  none: "Показаний к стационарному лечению не выявлено",
};

function sourcesFor(regionalReference: string): Source[] {
  return [
    {
      ...REGIONAL_ORDER,
      label: `${REGIONAL_ORDER.label}; ${regionalReference}`,
    },
    {
      label:
        "Действующий федеральный порядок для взрослых: приказ Минздрава России от 21.08.2025 № 495н",
      url: FEDERAL_ADULT_ORDER_URL,
    },
    {
      label:
        "Порядок оказания скорой медицинской помощи и медицинской эвакуации: приказ Минздрава России от 20.06.2013 № 388н",
      url: EMERGENCY_CARE_ORDER_URL,
    },
  ];
}

function targetForRouteGroup(routeGroup: RouteGroup): Facility {
  if (routeGroup === "borovichi") return FACILITIES.borovichi;
  if (routeGroup === "staraya_russa") return FACILITIES.starayaRussa;
  if (routeGroup === "pestovo") return FACILITIES.pestovo;
  return FACILITIES.noib;
}

function evaluateRouting(state: FormState): RoutingResult | null {
  const territory = TERRITORIES.find((item) => item.name === state.territory);
  if (!territory || state.lifeThreats.length === 0) return null;

  const hasLifeThreat = state.lifeThreats.some((item) => item !== "none");

  if (hasLifeThreat) {
    return {
      title: "Жизнеугрожающее инфекционное состояние",
      target: FACILITIES.nearestIcu,
      targetLabel: "Первый этап маршрута",
      nextTarget: FACILITIES.noib,
      nextTargetLabel: "После стабилизации — медицинская эвакуация",
      urgency: "Экстренно",
      transport:
        "В ближайшую согласованную медицинскую организацию с реанимационным отделением; прямой дальний транспорт до стабилизации не планировать.",
      actions: [
        "Немедленно согласовать ближайшее реанимационное отделение через диспетчера.",
        "Поддерживать жизненно важные функции и соблюдать санитарно-противоэпидемический режим.",
        "После стабилизации согласовать медицинскую эвакуацию в Новгородскую областную инфекционную больницу.",
      ],
      handoff: [
        `Угрожающие состояния: ${state.lifeThreats
          .filter((item) => item !== "none")
          .map((item) => LIFE_THREAT_LABELS[item])
          .join(", ")}.`,
        "Показатели дыхания, гемодинамики, сознания и проведённые мероприятия.",
        "Предполагаемый инфекционный диагноз и эпидемиологический анамнез.",
      ],
      sources: sourcesFor(
        "приложение № 1, страницы 2–3: помощь при жизнеугрожающих состояниях в реанимационном отделении и эвакуация после стабилизации",
      ),
    };
  }

  if (state.admissionCriteria.length === 0) return null;

  const hasSevereCourse = state.admissionCriteria.includes("severe");
  if (hasSevereCourse && state.transportable === undefined) return null;

  if (hasSevereCourse && state.transportable) {
    return {
      title: "Тяжёлое течение: прямой профильный маршрут",
      target: FACILITIES.noib,
      targetLabel: "Куда госпитализировать",
      urgency: "Экстренно после обязательного согласования",
      transport:
        "Бригадой СМП непосредственно в Новгородскую областную инфекционную больницу после подтверждения приёма.",
      actions: [
        "Согласовать госпитализацию с заведующим отделением реанимации и интенсивной терапии и руководителем принимающей организации.",
        "Сообщить диспетчеру подтверждённый маршрут и расчётное время доставки.",
        "Соблюдать санитарно-противоэпидемический режим во время транспортировки.",
      ],
      handoff: [
        "Признаки тяжёлого течения и обоснование транспортабельности.",
        "Показатели дыхания, гемодинамики и сознания в динамике.",
        "Предполагаемый диагноз, эпидемиологический анамнез и проведённые мероприятия.",
      ],
      sources: sourcesFor(
        "приложение № 1, страница 3: транспортабельные пациенты с тяжёлым течением госпитализируются непосредственно в ГОБУЗ «НОИБ» по согласованию",
      ),
    };
  }

  if (hasSevereCourse && state.transportable === false) {
    return {
      title: "Тяжёлое течение: пациент нетранспортабелен",
      target: FACILITIES.nearestIcu,
      targetLabel: "Первый этап маршрута",
      nextTarget: FACILITIES.noib,
      nextTargetLabel: "После стабилизации — при подтверждённой транспортабельности",
      urgency: "Экстренно",
      transport:
        "В ближайшую согласованную медицинскую организацию, способную провести стабилизацию; последующая эвакуация — отдельным решением.",
      actions: [
        "Согласовать ближайшую медицинскую организацию через диспетчера.",
        "Передать принимающей стороне причину нетранспортабельности и требуемый уровень помощи.",
        "После стабилизации повторно оценить транспортабельность и согласовать профильную эвакуацию.",
      ],
      handoff: [
        "Причина нетранспортабельности.",
        "Показатели дыхания, гемодинамики и сознания в динамике.",
        "Предполагаемый диагноз, эпидемиологический анамнез и проведённые мероприятия.",
      ],
      sources: sourcesFor(
        "приложение № 1, страницы 2–3: реанимационная помощь по месту первичной госпитализации и эвакуация после стабилизации",
      ),
      warning:
        "Приказ прямо описывает непосредственную госпитализацию в областную инфекционную больницу только для транспортабельных пациентов. Конкретный маршрут нетранспортабельного пациента определяет диспетчер.",
    };
  }

  if (state.admissionCriteria.includes("none")) {
    return {
      title: "Стационарная маршрутизация не требуется",
      target: FACILITIES.outpatient,
      targetLabel: "Дальнейшее наблюдение",
      urgency: "По клиническому состоянию",
      transport:
        "Перевозка в инфекционный стационар по выбранным критериям не требуется.",
      actions: [
        "Организовать передачу информации территориальной медицинской организации.",
        "Исключить совместное ожидание пациента с общим потоком при обращении в медицинскую организацию.",
        "При ухудшении состояния повторно оценить показания к госпитализации.",
      ],
      handoff: [
        "Предполагаемый диагноз, дата начала заболевания и эпидемиологический анамнез.",
        "Основание для амбулаторного наблюдения и признаки, требующие повторного вызова СМП.",
      ],
      sources: sourcesFor(
        "приложение № 1, страница 2: лёгкое течение без показаний к стационарному лечению ведётся амбулаторно",
      ),
    };
  }

  const target = targetForRouteGroup(territory.routeGroup);
  const direct = territory.routeGroup === "direct";

  return {
    title: direct
      ? "Показана госпитализация в областной инфекционный стационар"
      : "Показана госпитализация в территориальный инфекционный стационар",
    target,
    targetLabel: "Куда госпитализировать",
    nextTarget: direct ? undefined : FACILITIES.noib,
    nextTargetLabel: direct
      ? undefined
      : "Дальнейший профильный маршрут — при показаниях и согласовании",
    urgency: "По клиническим показаниям после согласования",
    transport:
      "Бригадой СМП после подтверждения готовности принимающей медицинской организации.",
    actions: [
      "Согласовать госпитализацию с принимающей медицинской организацией и диспетчером.",
      "Уточнить конкретный принимающий корпус и подъезд: приказ указывает организацию, но не адрес приёмного отделения.",
      "Соблюдать санитарно-противоэпидемический режим во время транспортировки.",
      ...(direct
        ? []
        : [
            "При необходимости помощи более высокого уровня согласовать перевод в Новгородскую областную инфекционную больницу.",
          ]),
    ],
    handoff: [
      `Показания к стационару: ${state.admissionCriteria
        .filter((item) => item !== "none")
        .map((item) => ADMISSION_LABELS[item])
        .join(", ")}.`,
      "Предполагаемый диагноз, дата начала заболевания и эпидемиологический анамнез.",
      "Состояние в динамике и проведённые мероприятия.",
    ],
    sources: sourcesFor(
      "приложение № 2, страница 4: схема территориальной маршрутизации взрослого населения с инфекционными заболеваниями",
    ),
  };
}

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

  const toggleAdmissionCriterion = (item: AdmissionCriterion) => {
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
  const needsTransportability = state.admissionCriteria.includes("severe");

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

            <Section title="2. Жизнеугрожающие состояния">
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
              <Section title="3. Показания к стационарному лечению">
                <p className="mb-3 text-sm text-neutral-600">
                  Отметьте все подходящие критерии. При отсутствии показаний
                  выберите последний вариант.
                </p>
                <div className="space-y-2">
                  {(
                    Object.keys(ADMISSION_LABELS) as AdmissionCriterion[]
                  ).map((item) => (
                    <CheckboxChoice
                      key={item}
                      checked={state.admissionCriteria.includes(item)}
                      onChange={() => toggleAdmissionCriterion(item)}
                      label={ADMISSION_LABELS[item]}
                    />
                  ))}
                </div>
              </Section>
            ) : null}

            {!hasLifeThreat && needsTransportability ? (
              <Section title="4. Транспортабельность">
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
                Выберите территорию и оцените жизнеугрожающие состояния. Если
                их нет — укажите показания к стационарному лечению.
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
          перенесена из приказа № 302-Д от 18.03.2022. Приказ указывает
          медицинскую организацию, но не конкретный приёмный корпус и не наличие
          свободных коек. Перед транспортировкой маршрут и адрес приёмного
          отделения обязательно подтверждаются диспетчером и принимающей
          стороной. Если действует отдельный временный или сезонный приказ по
          конкретной инфекции, применяется подтверждённая оперативная схема.
        </div>
      </div>
    </div>
  );
}
