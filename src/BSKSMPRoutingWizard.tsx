import { type ReactNode, useMemo, useState } from "react";

type Branch = "stroke" | "acs" | "other_cvd" | "kink";

type TerritoryGroup = "novgorod" | "borovichi" | "staraya_russa" | "valdai";

type StrokeOnset = "known" | "woke_with_symptoms" | "unknown";
type ArmMovement = "holds" | "drifts" | "falls";
type GripStrength = "normal" | "weak" | "absent";

type FacilityId =
  | "nokb"
  | "cgkb1"
  | "borovichi_crb"
  | "staraya_russa_crb"
  | "valdai_mmc"
  | "nearest_reanimation";

type Facility = {
  id: FacilityId;
  name: string;
  role: string;
  address?: string;
};

type Territory = {
  name: string;
  group: TerritoryGroup;
};

type BSKFormState = {
  territory?: string;
  branch: Branch;

  unstableVitals?: boolean;

  // ОНМК
  fastFace?: boolean;
  fastArm?: boolean;
  fastSpeech?: boolean;
  strokeOnset?: StrokeOnset;
  onsetWithin5h?: boolean;
  armMovement?: ArmMovement;
  gripStrength?: GripStrength;

  // ОКС
  chestPainOrEquivalent?: boolean;
  ecgDone?: boolean;
  stElevation?: boolean;
  pciWithin120?: boolean;
  tltContraindications?: boolean;
  nsteHighRisk?: boolean;

  // Другие острые ССЗ
  rhythmDisorder?: boolean;
  conductionDisorder?: boolean;
  suspectedPE?: boolean;
  acuteHeartFailure?: boolean;

  // КИНК
  restPain?: boolean;
  legDownAtNight?: boolean;
  trophicChanges?: boolean;
  necrosisGangrene?: boolean;
  infectionSigns?: boolean;
};

type RoutingResult = {
  title: string;
  target: Facility;
  alternative?: Facility;
  urgency: string;
  transport: string;
  notify: string[];
  checklist: string[];
  handoff: string[];
  sources: string[];
  warnings: string[];
};

const FACILITIES: Record<FacilityId, Facility> = {
  nokb: {
    id: "nokb",
    name: "ГОБУЗ «Новгородская областная клиническая больница»",
    role: "РСЦ / региональный сосудистый центр / РЦ КИНК / НОКБ",
    address: "Великий Новгород, ул. Павла Левитта, д. 14",
  },
  cgkb1: {
    id: "cgkb1",
    name: "ГОБУЗ «Центральная городская клиническая больница», Клиника №1",
    role: "ПСО / экстренная кардиология и неврология / хирургический маршрут по отдельным показаниям",
    address: "Великий Новгород, ул. Зелинского, д. 11",
  },
  borovichi_crb: {
    id: "borovichi_crb",
    name: "ГОБУЗ «Боровичская центральная районная больница»",
    role: "МРСЦ / ПСО по отдельным веткам",
    address: "г. Боровичи, пл. 1 Мая, д. 2А",
  },
  staraya_russa_crb: {
    id: "staraya_russa_crb",
    name: "ГОБУЗ «Старорусская центральная районная больница»",
    role: "МРСЦ / ПСО по отдельным веткам",
    address: "г. Старая Русса, ул. Гостинодворская, д. 50",
  },
  valdai_mmc: {
    id: "valdai_mmc",
    name: "Валдайский многопрофильный медицинский центр ФМБА России",
    role: "ПСО / межрайонный контур по отдельным веткам",
    address: "г. Валдай, ул. Песчаная, д. 1А",
  },
  nearest_reanimation: {
    id: "nearest_reanimation",
    name: "Ближайшая медицинская организация с реанимационным отделением",
    role: "Маршрут при нестабильном пациенте",
  },
};

const TERRITORIES: Territory[] = [
  { name: "Великий Новгород", group: "novgorod" },
  { name: "Новгородский", group: "novgorod" },
  { name: "Шимский", group: "novgorod" },
  { name: "Батецкий", group: "novgorod" },
  { name: "Солецкий", group: "novgorod" },
  { name: "Чудовский", group: "novgorod" },
  { name: "Маловишерский", group: "novgorod" },

  { name: "Боровичский", group: "borovichi" },
  { name: "Мошенской", group: "borovichi" },
  { name: "Любытинский", group: "borovichi" },
  { name: "Окуловский", group: "borovichi" },
  { name: "Пестовский", group: "borovichi" },
  { name: "Хвойнинский", group: "borovichi" },

  { name: "Старорусский", group: "staraya_russa" },
  { name: "Парфинский", group: "staraya_russa" },
  { name: "Волотовский", group: "staraya_russa" },
  { name: "Поддорский", group: "staraya_russa" },
  { name: "Холмский", group: "staraya_russa" },

  { name: "Валдайский", group: "valdai" },
  { name: "Крестецкий", group: "valdai" },
  { name: "Демянский", group: "valdai" },
  { name: "Марёвский", group: "valdai" },
];

const BRANCH_LABELS: Record<Branch, string> = {
  stroke: "ОНМК / подозрение на инсульт",
  acs: "ОКС / подозрение на инфаркт",
  other_cvd: "Другие острые ССЗ",
  kink: "КИНК — критическая ишемия нижней конечности / угроза конечности",
};

function getTerritory(territory?: string): Territory | undefined {
  return TERRITORIES.find((item) => item.name === territory);
}

function routeByGroupForOtherCvd(group: TerritoryGroup): Facility {
  if (group === "novgorod") return FACILITIES.cgkb1;
  if (group === "borovichi") return FACILITIES.borovichi_crb;
  if (group === "staraya_russa") return FACILITIES.staraya_russa_crb;
  return FACILITIES.valdai_mmc;
}

function routeStroke(territoryName: string, group: TerritoryGroup): Facility {
  // По схеме ОНМК:
  // ЦГКБ Клиника №1: Великий Новгород, Новгородский, Шимский, Батецкий,
  // Солецкий, Чудовский, Маловишерский, а также Крестецкий и Валдайский.
  // Боровичская ЦРБ: Боровичский, Мошенской, Любытинский, Окуловский, Пестовский, Хвойнинский.
  // Старорусская ЦРБ: Старорусский, Парфинский, Волотовский, Поддорский,
  // Холмский, Демянский, Марёвский.
  if (group === "borovichi") return FACILITIES.borovichi_crb;
  if (group === "staraya_russa") return FACILITIES.staraya_russa_crb;
  if (territoryName === "Демянский" || territoryName === "Марёвский") {
    return FACILITIES.staraya_russa_crb;
  }
  return FACILITIES.cgkb1;
}

function routeAcsByGroup(group: TerritoryGroup): Facility {
  // По схеме ОКС:
  // РСЦ НОКБ: пациенты с показаниями к раннему ЧКВ, а также новгородская зона.
  // Валдайский ММЦ: Валдайский, Крестецкий, Демянский, Марёвский.
  // Боровичская и Старорусская ЦРБ: соответствующие межрайонные зоны.
  if (group === "novgorod") return FACILITIES.nokb;
  if (group === "borovichi") return FACILITIES.borovichi_crb;
  if (group === "staraya_russa") return FACILITIES.staraya_russa_crb;
  return FACILITIES.valdai_mmc;
}

function routeKinkSurgicalByTerritory(territoryName: string): Facility {
  // При необратимых изменениях конечности / невозможности реваскуляризации:
  // ЦГКБ Клиника №1: Великий Новгород, Новгородский, Батецкий,
  // Маловишерский, Чудовский, Солецкий, Шимский.
  // Остальные территории по видимому фрагменту маршрутизируются в хирургическое отделение НОКБ.
  const cgkbKinkSurgery = [
    "Великий Новгород",
    "Новгородский",
    "Батецкий",
    "Маловишерский",
    "Чудовский",
    "Солецкий",
    "Шимский",
  ];

  if (cgkbKinkSurgery.includes(territoryName)) {
    return FACILITIES.cgkb1;
  }

  return FACILITIES.nokb;
}

function evaluateRouting(state: BSKFormState): RoutingResult | null {
  const territory = getTerritory(state.territory);

  if (!territory) {
    return null;
  }

  const warnings: string[] = [];

  if (state.unstableVitals) {
    return {
      title: "Нестабильный пациент: приоритет ближайшей МО с реанимацией",
      target: FACILITIES.nearest_reanimation,
      alternative: routeByGroupForOtherCvd(territory.group),
      urgency: "Экстренно. Сначала стабилизация витальных функций.",
      transport: "СМП / реанимационная бригада по состоянию пациента.",
      notify: [
        "Предупредить ближайшую МО с реанимацией/ОРИТ.",
        "Сообщить предполагаемый диагноз или ведущий синдром и время прибытия.",
      ],
      checklist: [
        "Оценить сознание, дыхание, гемодинамику.",
        "АД, ЧСС, SpO₂, ЭКГ, глюкоза крови по показаниям.",
        "Начать неотложные мероприятия по состоянию пациента.",
        "После стабилизации — профильная маршрутизация по ветке БСК.",
      ],
      handoff: [
        "Ведущий синдром.",
        "Витальные показатели.",
        "Проведённые мероприятия.",
        "Динамика состояния во время транспортировки.",
      ],
      sources: [
        "Общее правило маршрутизации: при выраженных нарушениях витальных функций пациент доставляется в ближайшую МО с реанимационным отделением.",
      ],
      warnings,
    };
  }

  if (state.branch === "stroke") {
    const fastPositive = Boolean(state.fastFace || state.fastArm || state.fastSpeech);
    // Прежний порог маршрутизации сохраняется, но теперь рассчитывается
    // автоматически по наблюдаемым признакам: лицо (0/1), рука (0/1/2), кисть (0/1/2).
    const motorDeficitScore =
      (state.fastFace ? 1 : 0) +
      (state.armMovement === "drifts" ? 1 : state.armMovement === "falls" ? 2 : 0) +
      (state.gripStrength === "weak" ? 1 : state.gripStrength === "absent" ? 2 : 0);
    const severeMotorDeficit = motorDeficitScore >= 4;
    const zonePso = routeStroke(territory.name, territory.group);
    const target = severeMotorDeficit || state.onsetWithin5h ? FACILITIES.nokb : zonePso;

    return {
      title: "Маршрутизация СМП при подозрении на ОНМК",
      target,
      alternative: target.id === zonePso.id ? undefined : zonePso,
      urgency: state.onsetWithin5h
        ? "Приоритетная эвакуация в пределах терапевтического окна."
        : "Экстренная эвакуация. Все пациенты с подозрением на ОНМК подлежат госпитализации.",
      transport: "СМП. При тяжёлом состоянии — реанимационная бригада по показаниям.",
      notify: [
        "Оповестить принимающее ПСО/РСЦ о пациенте с подозрением на ОНМК.",
        severeMotorDeficit
          ? "Выраженный двигательный дефицит: высокий риск поражения крупной артерии; требуется согласование с РСЦ."
          : "Передать основные неврологические симптомы и время их начала.",
      ],
      checklist: [
        "Оценить асимметрию лица, слабость руки и нарушение речи.",
        "Уточнить точное время начала симптомов или отметить, что пациент проснулся уже с симптомами.",
        "Оценить, удерживает ли пациент руку и насколько сохранена сила сжатия кисти.",
        "АД, ЧСС, SpO₂.",
        "Глюкоза крови.",
        "ЭКГ.",
        "Периферический венозный доступ.",
        "Заполнить чек-лист пациента с подозрением на ОНМК.",
        fastPositive
          ? "Есть как минимум один основной признак ОНМК."
          : "Основные признаки не отмечены: проверить другие внезапные неврологические симптомы.",
      ],
      handoff: [
        "Время начала симптомов / неизвестно / пациент проснулся с симптомами.",
        "Асимметрия лица, слабость руки, нарушение речи.",
        "Способность удерживать руку и сила сжатия кисти.",
        "АД, ЧСС, SpO₂, глюкоза.",
        "ЭКГ.",
        "Антикоагулянты, травма головы, операции, кровотечения — если известно.",
        "Время предполагаемого прибытия.",
      ],
      sources: [
        "Приказ №1368-Д, приложения 20–26: регламент маршрутизации ОНМК и чек-лист СМП.",
      ],
      warnings,
    };
  }

  if (state.branch === "acs") {
    const zoneAcs = routeAcsByGroup(territory.group);
    const target =
      state.stElevation && state.pciWithin120
        ? FACILITIES.nokb
        : state.nsteHighRisk
          ? FACILITIES.nokb
          : zoneAcs;

    return {
      title: "Маршрутизация СМП при подозрении на ОКС",
      target,
      alternative: target.id === zoneAcs.id ? undefined : zoneAcs,
      urgency: state.stElevation
        ? "ОКС с подъёмом ST: временной алгоритм реперфузии."
        : "ОКС без подъёма ST / неясный ОКС: маршрутизация по риску и зоне.",
      transport: "СМП. При нестабильности — ближайшая МО с реанимацией.",
      notify: [
        "Предупредить принимающую МО о пациенте с подозрением на ОКС.",
        state.stElevation
          ? "При подъёме ST сообщить время начала симптомов, время первого контакта и результат ЭКГ."
          : "Передать клинику, ЭКГ и признаки высокого риска.",
      ],
      checklist: [
        "Собрать анамнез и время начала симптомов.",
        "ЭКГ 12 отведений не позднее 10 минут от первого контакта.",
        "Определить: есть подъём ST / новая БЛНПГ / признаки заднего ИМ.",
        state.stElevation
          ? "Оценить возможность доставки на ЧКВ ≤ 120 минут."
          : "Оценить признаки высокого/очень высокого риска.",
        state.stElevation && !state.pciWithin120
          ? "Если ЧКВ ≤ 120 минут недоступно — рассмотреть ТЛТ, решение ≤ 20 минут."
          : "Если ЧКВ ≤ 120 минут доступно — приоритет РСЦ/ЧКВ.",
        state.tltContraindications
          ? "Отмечены противопоказания к ТЛТ: требуется врачебная оценка."
          : "Проверить показания и противопоказания к ТЛТ, если ТЛТ рассматривается.",
      ],
      handoff: [
        "Время начала симптомов.",
        "Время первого контакта.",
        "Время выполнения ЭКГ.",
        "Описание ЭКГ.",
        "Проведённая терапия.",
        "Решение по ТЛТ и время введения, если проводилась.",
        "Динамика состояния.",
      ],
      sources: [
        "Приказ №1368-Д, приложения 27–34: регламент ОКС, догоспитальный этап, ТЛТ, ЧКВ, схема эвакуации.",
      ],
      warnings,
    };
  }

  if (state.branch === "other_cvd") {
    return {
      title: "Маршрутизация СМП при других острых ССЗ",
      target: routeByGroupForOtherCvd(territory.group),
      alternative: FACILITIES.nokb,
      urgency: "Экстренно или неотложно по состоянию пациента.",
      transport: "СМП. При нестабильности — ближайшая МО с реанимацией.",
      notify: [
        "Предупредить принимающую МО.",
        "Сообщить ведущий синдром: аритмия / нарушение проводимости / ТЭЛА / острая СН.",
      ],
      checklist: [
        "Определить ведущий синдром.",
        state.rhythmDisorder ? "Нарушение ритма отмечено." : "Оценить наличие нарушения ритма.",
        state.conductionDisorder
          ? "Нарушение проводимости отмечено."
          : "Оценить наличие нарушения проводимости.",
        state.suspectedPE ? "Подозрение на ТЭЛА отмечено." : "Оценить признаки ТЭЛА.",
        state.acuteHeartFailure
          ? "Острая сердечная недостаточность отмечена."
          : "Оценить признаки острой СН.",
        "АД, ЧСС, SpO₂, ЭКГ.",
        "Провести необходимые лечебные мероприятия по состоянию.",
        "Телефонное сообщение в принимающую МО.",
      ],
      handoff: [
        "Ведущий синдром.",
        "Витальные показатели.",
        "ЭКГ.",
        "SpO₂.",
        "Проведённые мероприятия.",
        "Динамика при транспортировке.",
      ],
      sources: [
        "Приказ №1368-Д, приложение 18: схема эвакуации при нарушениях ритма, проводимости, ТЭЛА, острой СН.",
      ],
      warnings,
    };
  }

  const painKink = Boolean(state.restPain || state.legDownAtNight);
  const destructiveOrInfected = Boolean(state.necrosisGangrene || state.infectionSigns);
  const probableKink = Boolean(painKink || destructiveOrInfected || state.trophicChanges);

  let target: Facility;
  let alternative: Facility | undefined;

  if (painKink) {
    target = FACILITIES.nokb;
    alternative = routeKinkSurgicalByTerritory(territory.name);
  } else if (destructiveOrInfected) {
    target = routeKinkSurgicalByTerritory(territory.name);
    alternative = FACILITIES.nokb;
  } else {
    target = routeByGroupForOtherCvd(territory.group);
    alternative = FACILITIES.nokb;
  }

  return {
    title: "Маршрутизация СМП при подозрении на КИНК — критическую ишемию нижней конечности",
    target,
    alternative,
    urgency: painKink
      ? "Срочная сосудистая маршрутизация: боль покоя / высокая вероятность КИНК."
      : destructiveOrInfected
        ? "Срочная хирургическая оценка: некроз, гангрена или инфекционно-воспалительные изменения."
        : probableKink
          ? "Требуется оценка вероятности КИНК и сосудисто-хирургическое согласование по показаниям."
          : "КИНК не подтверждена введёнными признаками; требуется клиническая оценка.",
    transport: "СМП / медицинский транспорт по состоянию пациента.",
    notify: [
      painKink
        ? "При боли покоя или высокой вероятности КИНК — согласовать маршрут с сосудистым хирургом НОКБ / РЦ КИНК."
        : "Предупредить принимающую МО и передать признаки угрозы конечности.",
      destructiveOrInfected
        ? "При некрозе, гангрене, инфекции или угрозе жизни — предупредить принимающую хирургическую МО."
        : "Если есть трофические изменения без боли покоя — передать данные для решения вопроса об обследовании и консультации.",
    ],
    checklist: [
      "Оценить боль в покое.",
      "Уточнить, опускает ли пациент ногу вниз ночью для уменьшения боли.",
      "Осмотреть язвы, некрозы, гангрену, трофические изменения.",
      "Оценить признаки инфекционно-воспалительных изменений.",
      "Уточнить сахарный диабет, курение, ИБС, перенесённые сосудистые события.",
      "При подозрении на необходимость ампутации — не терять этап оценки возможности реваскуляризации / снижения уровня ампутации.",
    ],
    handoff: [
      "Боль покоя: да/нет.",
      "Опускает ли пациент ногу вниз ночью для уменьшения боли.",
      "Локализация язв/некроза/гангрены.",
      "Признаки инфекции.",
      "Давность симптомов.",
      "Сахарный диабет и сосудистый анамнез.",
      "Общее состояние пациента.",
    ],
    sources: [
      "Приказ №1368-Д, приложения 39–42: критическая ишемия нижней конечности, РЦ КИНК, алгоритм клинической вероятности.",
    ],
    warnings,
  };
}

function CheckBox(props: {
  checked?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex gap-3 rounded-2xl border border-neutral-200 bg-white p-3">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4"
        checked={Boolean(props.checked)}
        onChange={(event) => props.onChange(event.currentTarget.checked)}
      />
      <span>
        <span className="block text-sm font-medium text-neutral-900">
          {props.label}
        </span>
        {props.hint ? (
          <span className="block text-xs text-neutral-500 mt-0.5">{props.hint}</span>
        ) : null}
      </span>
    </label>
  );
}

function Section(props: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="text-lg font-semibold mb-4">{props.title}</div>
      {props.children}
    </div>
  );
}

function ListBlock(props: { title: string; items: string[] }) {
  if (props.items.length === 0) return null;

  return (
    <div>
      <div className="font-semibold text-sm mb-2">{props.title}</div>
      <ul className="list-disc pl-5 space-y-1 text-sm text-neutral-700">
        {props.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function FacilityCard(props: { facility: Facility; label?: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      {props.label ? (
        <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">
          {props.label}
        </div>
      ) : null}
      <div className="font-semibold">{props.facility.name}</div>
      <div className="text-sm text-neutral-600">{props.facility.role}</div>
      {props.facility.address ? (
        <div className="text-sm text-neutral-500 mt-1">{props.facility.address}</div>
      ) : null}
    </div>
  );
}

export default function BSKSMPRoutingWizard() {
  const [state, setState] = useState<BSKFormState>({
    branch: "stroke",
  });

  const result = useMemo(() => evaluateRouting(state), [state]);

  const patch = (next: Partial<BSKFormState>) => {
    setState((prev) => ({ ...prev, ...next }));
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="text-2xl font-bold">
            БСК / ССЗ: маршрутизация пациентов для СМП
          </div>
          <div className="text-sm text-neutral-600 mt-2">
            Профиль для скорой медицинской помощи: ОНМК, ОКС, другие острые ССЗ,
            КИНК — критическая ишемия нижней конечности. Показываем маршрут,
            срочность, кого предупредить и какие данные передать принимающей
            стороне.
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <Section title="1. Территория и общий риск">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Муниципальный округ / место вызова
                  </label>
                  <select
                    className="w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2"
                    value={state.territory ?? ""}
                    onChange={(event) =>
                      patch({ territory: event.currentTarget.value || undefined })
                    }
                  >
                    <option value="">Выберите территорию</option>
                    {TERRITORIES.map((territory) => (
                      <option key={territory.name} value={territory.name}>
                        {territory.name}
                      </option>
                    ))}
                  </select>
                </div>

                <CheckBox
                  checked={state.unstableVitals}
                  onChange={(checked) => patch({ unstableVitals: checked })}
                  label="Есть выраженные нарушения витальных функций"
                  hint="Шок, критическая гипотензия, тяжёлая дыхательная недостаточность, угроза остановки кровообращения, необходимость реанимации."
                />
              </div>
            </Section>

            <Section title="2. Ведущая ветка">
              <div className="grid grid-cols-1 gap-2">
                {(Object.keys(BRANCH_LABELS) as Branch[]).map((branch) => (
                  <button
                    key={branch}
                    type="button"
                    onClick={() => patch({ branch })}
                    className={[
                      "rounded-2xl border p-3 text-left transition",
                      state.branch === branch
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 bg-white hover:bg-neutral-50",
                    ].join(" ")}
                  >
                    <div className="font-semibold">{BRANCH_LABELS[branch]}</div>
                  </button>
                ))}
              </div>
            </Section>

            {state.branch === "stroke" ? (
              <Section title="3. ОНМК: признаки и время начала симптомов">
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-neutral-800">
                    Основные признаки
                  </div>
                  <CheckBox
                    checked={state.fastFace}
                    onChange={(checked) => patch({ fastFace: checked })}
                    label="Есть асимметрия лица"
                  />
                  <CheckBox
                    checked={state.fastArm}
                    onChange={(checked) =>
                      patch({
                        fastArm: checked,
                        armMovement: checked ? state.armMovement : undefined,
                        gripStrength: checked ? state.gripStrength : undefined,
                      })
                    }
                    label="Есть слабость или онемение одной руки"
                  />
                  <CheckBox
                    checked={state.fastSpeech}
                    onChange={(checked) => patch({ fastSpeech: checked })}
                    label="Есть нарушение речи"
                  />

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Когда появились симптомы?
                    </label>
                    <select
                      className="w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2"
                      value={state.strokeOnset ?? ""}
                      onChange={(event) =>
                        patch({
                          strokeOnset: (event.currentTarget.value || undefined) as
                            | StrokeOnset
                            | undefined,
                          onsetWithin5h:
                            event.currentTarget.value === "known"
                              ? state.onsetWithin5h
                              : undefined,
                        })
                      }
                    >
                      <option value="">Выберите вариант</option>
                      <option value="known">Точное время начала известно</option>
                      <option value="woke_with_symptoms">
                        Пациент проснулся уже с симптомами
                      </option>
                      <option value="unknown">Время начала неизвестно</option>
                    </select>
                  </div>

                  {state.strokeOnset === "known" ? (
                    <CheckBox
                      checked={state.onsetWithin5h}
                      onChange={(checked) => patch({ onsetWithin5h: checked })}
                      label="С учётом доставки пациент окажется в стационаре не позднее 5 часов от начала симптомов"
                    />
                  ) : null}

                  {state.fastArm ? (
                    <div className="space-y-3 rounded-2xl bg-neutral-50 p-3">
                      <div>
                        <div className="text-sm font-semibold text-neutral-800">
                          Тяжесть слабости руки
                        </div>
                        <div className="text-xs text-neutral-500 mt-0.5">
                          Выберите наблюдаемые признаки.
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Как пациент удерживает вытянутую руку?
                        </label>
                        <select
                          className="w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2"
                          value={state.armMovement ?? ""}
                          onChange={(event) =>
                            patch({
                              armMovement: (event.currentTarget.value || undefined) as
                                | ArmMovement
                                | undefined,
                            })
                          }
                        >
                          <option value="">Выберите вариант</option>
                          <option value="holds">Удерживает руку</option>
                          <option value="drifts">Рука постепенно опускается</option>
                          <option value="falls">Рука быстро падает или не удерживается</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Сила сжатия кисти
                        </label>
                        <select
                          className="w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2"
                          value={state.gripStrength ?? ""}
                          onChange={(event) =>
                            patch({
                              gripStrength: (event.currentTarget.value || undefined) as
                                | GripStrength
                                | undefined,
                            })
                          }
                        >
                          <option value="">Выберите вариант</option>
                          <option value="normal">Сила сохранена</option>
                          <option value="weak">Сила снижена</option>
                          <option value="absent">Сжатие кисти отсутствует</option>
                        </select>
                      </div>
                    </div>
                  ) : null}
                </div>
              </Section>
            ) : null}

            {state.branch === "acs" ? (
              <Section title="3. ОКС: симптомы / ЭКГ / ЧКВ / ТЛТ">
                <div className="space-y-3">
                  <CheckBox
                    checked={state.chestPainOrEquivalent}
                    onChange={(checked) => patch({ chestPainOrEquivalent: checked })}
                    label="Боль в грудной клетке или эквивалент ОКС"
                  />
                  <CheckBox
                    checked={state.ecgDone}
                    onChange={(checked) => patch({ ecgDone: checked })}
                    label="ЭКГ 12 отведений выполнена"
                    hint="Цель — не позднее 10 минут от первого контакта."
                  />
                  <CheckBox
                    checked={state.stElevation}
                    onChange={(checked) => patch({ stElevation: checked })}
                    label="Есть подъём ST / новая БЛНПГ / признаки заднего ИМ"
                  />
                  <CheckBox
                    checked={state.pciWithin120}
                    onChange={(checked) => patch({ pciWithin120: checked })}
                    label="Доставка на ЧКВ возможна в пределах 120 минут"
                  />
                  <CheckBox
                    checked={state.tltContraindications}
                    onChange={(checked) => patch({ tltContraindications: checked })}
                    label="Есть противопоказания к ТЛТ / требуется осторожность"
                  />
                  <CheckBox
                    checked={state.nsteHighRisk}
                    onChange={(checked) => patch({ nsteHighRisk: checked })}
                    label="ОКС без подъёма ST, но есть высокий/очень высокий риск"
                  />
                </div>
              </Section>
            ) : null}

            {state.branch === "other_cvd" ? (
              <Section title="3. Другие острые ССЗ">
                <div className="space-y-3">
                  <CheckBox
                    checked={state.rhythmDisorder}
                    onChange={(checked) => patch({ rhythmDisorder: checked })}
                    label="Нарушение ритма"
                  />
                  <CheckBox
                    checked={state.conductionDisorder}
                    onChange={(checked) => patch({ conductionDisorder: checked })}
                    label="Нарушение проводимости"
                  />
                  <CheckBox
                    checked={state.suspectedPE}
                    onChange={(checked) => patch({ suspectedPE: checked })}
                    label="Подозрение на ТЭЛА"
                  />
                  <CheckBox
                    checked={state.acuteHeartFailure}
                    onChange={(checked) => patch({ acuteHeartFailure: checked })}
                    label="Острая сердечная недостаточность"
                  />
                </div>
              </Section>
            ) : null}

            {state.branch === "kink" ? (
              <Section title="3. КИНК — критическая ишемия нижней конечности">
                <div className="space-y-3">
                  <CheckBox
                    checked={state.restPain}
                    onChange={(checked) => patch({ restPain: checked })}
                    label="Боль в нижней конечности в покое"
                  />
                  <CheckBox
                    checked={state.legDownAtNight}
                    onChange={(checked) => patch({ legDownAtNight: checked })}
                    label="Пациент опускает ногу вниз ночью для уменьшения боли"
                  />
                  <CheckBox
                    checked={state.trophicChanges}
                    onChange={(checked) => patch({ trophicChanges: checked })}
                    label="Есть трофические изменения / язвы"
                  />
                  <CheckBox
                    checked={state.necrosisGangrene}
                    onChange={(checked) => patch({ necrosisGangrene: checked })}
                    label="Некроз / гангрена"
                  />
                  <CheckBox
                    checked={state.infectionSigns}
                    onChange={(checked) => patch({ infectionSigns: checked })}
                    label="Инфекционно-воспалительные изменения"
                  />
                </div>
              </Section>
            ) : null}
          </div>

          <div className="space-y-4">
            <Section title="Итог маршрутизации">
              {!result ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Сначала выбери территорию вызова. После этого система покажет
                  предварительный маршрут, действия СМП и данные для передачи.
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-xl font-bold">{result.title}</div>
                    <div className="text-sm text-neutral-600 mt-1">
                      Срочность: {result.urgency}
                    </div>
                    <div className="text-sm text-neutral-600">
                      Транспорт: {result.transport}
                    </div>
                  </div>

                  <FacilityCard facility={result.target} label="Рекомендуемая МО" />

                  {result.alternative ? (
                    <FacilityCard
                      facility={result.alternative}
                      label="Дополнительный ориентир / зона / уровень согласования"
                    />
                  ) : null}

                  <ListBlock title="Кого предупредить" items={result.notify} />
                  <ListBlock title="Чек-лист СМП" items={result.checklist} />
                  <ListBlock
                    title="Что передать принимающей стороне"
                    items={result.handoff}
                  />
                  <ListBlock title="Основание" items={result.sources} />

                  {result.warnings.length > 0 ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                      <div className="font-semibold text-sm text-red-900 mb-2">
                        Требует врачебной сверки
                      </div>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-red-800">
                        {result.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
