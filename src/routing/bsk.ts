import type { RoutingProfileDefinition } from "./types";
import { bskRoutingContent } from "./content-manifests";
import {
  BSK_BRANCH_LABELS_V1,
  BSK_RULE_SET_V1,
  BSK_TERRITORIES_V1,
} from "./bsk-rules-v1";
import { evaluateRoutingRuleSetV1 } from "./rules-v1";

export type Branch = "stroke" | "acs" | "other_cvd" | "kink";

type TerritoryGroup = "novgorod" | "borovichi" | "staraya_russa" | "valdai";

export type StrokeOnset = "known" | "woke_with_symptoms" | "unknown";
export type ArmMovement = "holds" | "drifts" | "falls";
export type GripStrength = "normal" | "weak" | "absent";

type FacilityId =
  | "nokb"
  | "cgkb1"
  | "borovichi_crb"
  | "staraya_russa_crb"
  | "valdai_mmc"
  | "nearest_reanimation";

export type Facility = {
  id: FacilityId;
  name: string;
  role: string;
  address?: string;
};

type Territory = {
  name: string;
  group: TerritoryGroup;
};

export type BSKFormState = {
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

export type RoutingResult = {
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

const LEGACY_FACILITIES: Record<FacilityId, Facility> = {
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

const LEGACY_TERRITORIES: Territory[] = [
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

export const TERRITORIES = BSK_TERRITORIES_V1;
export const BRANCH_LABELS: Readonly<Record<Branch, string>> =
  BSK_BRANCH_LABELS_V1;

function getTerritory(territory?: string): Territory | undefined {
  return LEGACY_TERRITORIES.find((item) => item.name === territory);
}

function routeByGroupForOtherCvd(group: TerritoryGroup): Facility {
  if (group === "novgorod") return LEGACY_FACILITIES.cgkb1;
  if (group === "borovichi") return LEGACY_FACILITIES.borovichi_crb;
  if (group === "staraya_russa") return LEGACY_FACILITIES.staraya_russa_crb;
  return LEGACY_FACILITIES.valdai_mmc;
}

function routeStroke(territoryName: string, group: TerritoryGroup): Facility {
  // По схеме ОНМК:
  // ЦГКБ Клиника №1: Великий Новгород, Новгородский, Шимский, Батецкий,
  // Солецкий, Чудовский, Маловишерский, а также Крестецкий и Валдайский.
  // Боровичская ЦРБ: Боровичский, Мошенской, Любытинский, Окуловский, Пестовский, Хвойнинский.
  // Старорусская ЦРБ: Старорусский, Парфинский, Волотовский, Поддорский,
  // Холмский, Демянский, Марёвский.
  if (group === "borovichi") return LEGACY_FACILITIES.borovichi_crb;
  if (group === "staraya_russa") return LEGACY_FACILITIES.staraya_russa_crb;
  if (territoryName === "Демянский" || territoryName === "Марёвский") {
    return LEGACY_FACILITIES.staraya_russa_crb;
  }
  return LEGACY_FACILITIES.cgkb1;
}

function routeAcsByGroup(group: TerritoryGroup): Facility {
  // По схеме ОКС:
  // РСЦ НОКБ: пациенты с показаниями к раннему ЧКВ, а также новгородская зона.
  // Валдайский ММЦ: Валдайский, Крестецкий, Демянский, Марёвский.
  // Боровичская и Старорусская ЦРБ: соответствующие межрайонные зоны.
  if (group === "novgorod") return LEGACY_FACILITIES.nokb;
  if (group === "borovichi") return LEGACY_FACILITIES.borovichi_crb;
  if (group === "staraya_russa") return LEGACY_FACILITIES.staraya_russa_crb;
  return LEGACY_FACILITIES.valdai_mmc;
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
    return LEGACY_FACILITIES.cgkb1;
  }

  return LEGACY_FACILITIES.nokb;
}

export function evaluateRoutingLegacy(
  state: BSKFormState,
): RoutingResult | null {
  const territory = getTerritory(state.territory);

  if (!territory) {
    return null;
  }

  const warnings: string[] = [];

  if (state.unstableVitals) {
    return {
      title: "Нестабильный пациент: приоритет ближайшей МО с реанимацией",
      target: LEGACY_FACILITIES.nearest_reanimation,
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
    const target = severeMotorDeficit || state.onsetWithin5h
      ? LEGACY_FACILITIES.nokb
      : zonePso;

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
        ? LEGACY_FACILITIES.nokb
        : state.nsteHighRisk
          ? LEGACY_FACILITIES.nokb
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
      alternative: LEGACY_FACILITIES.nokb,
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
    target = LEGACY_FACILITIES.nokb;
    alternative = routeKinkSurgicalByTerritory(territory.name);
  } else if (destructiveOrInfected) {
    target = routeKinkSurgicalByTerritory(territory.name);
    alternative = LEGACY_FACILITIES.nokb;
  } else {
    target = routeByGroupForOtherCvd(territory.group);
    alternative = LEGACY_FACILITIES.nokb;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isFacility(value: unknown): value is Facility {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.role === "string" &&
    (value.address === undefined || typeof value.address === "string")
  );
}

function routingResultFromRules(value: unknown): RoutingResult {
  if (
    !isRecord(value) ||
    typeof value.title !== "string" ||
    !isFacility(value.target) ||
    (value.alternative !== undefined && !isFacility(value.alternative)) ||
    typeof value.urgency !== "string" ||
    typeof value.transport !== "string" ||
    !isStringArray(value.notify) ||
    !isStringArray(value.checklist) ||
    !isStringArray(value.handoff) ||
    !isStringArray(value.sources) ||
    !isStringArray(value.warnings)
  ) {
    throw new Error("rules_v1 вернул некорректный результат профиля БСК.");
  }
  return value as RoutingResult;
}

export function evaluateRoutingRulesV1(
  state: BSKFormState,
): RoutingResult | null {
  const evaluation = evaluateRoutingRuleSetV1(BSK_RULE_SET_V1, state);
  return evaluation ? routingResultFromRules(evaluation.result) : null;
}

export function evaluateRouting(state: BSKFormState): RoutingResult | null {
  return evaluateRoutingRulesV1(state);
}

export const bskRoutingProfile = {
  id: "bsk",
  title: "БСК / ССЗ",
  description: "СМП: ОНМК → ОКС → другие острые ССЗ → КИНК",
  content: bskRoutingContent,
  evaluate: evaluateRouting,
} satisfies RoutingProfileDefinition<BSKFormState, RoutingResult>;
