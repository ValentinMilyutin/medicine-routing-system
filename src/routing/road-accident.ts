import type { RoutingProfileDefinition } from "./types";
import { roadAccidentRoutingContent } from "./content-manifests";
import {
  ROAD_ACCIDENT_AGE_LABELS_V1,
  ROAD_ACCIDENT_INJURY_LABELS_V1,
  ROAD_ACCIDENT_M11_RESPONDER_LABELS_V1,
  ROAD_ACCIDENT_M11_ZONES_V1,
  ROAD_ACCIDENT_RULE_SET_V1,
  ROAD_ACCIDENT_TERRITORIES_V1,
} from "./road-accident-rules-v1";
import { evaluateRoutingRuleSetV1 } from "./rules-v1";

export type AgeGroup = "child_0_15" | "age_16_17" | "adult_18_plus";
export type LocationKind = "territory" | "m10" | "m11";
export type M10Zone = "valdai_kresttsy" | "zaytsevo_novgorod_chudovo";
export type M11Responder = "novgorod_smp" | "nokb_cmk" | "valdai_mmc";
export type M11Zone = "570_474" | "474_389" | "570_389" | "389_444";
export type InjuryCriterion =
  | "severe_tbi_or_shock"
  | "specialized_injury"
  | "other_without_shock"
  | "stable_isolated_limb"
  | "life_saving_10_20";

type FacilityId =
  | "nokb"
  | "odkb"
  | "cgkb1"
  | "borovichi"
  | "staraya_russa"
  | "valdai"
  | "kresttsy"
  | "chudovo"
  | "demyansk"
  | "zarubino"
  | "malaya_vishera"
  | "okulovka"
  | "pestovo"
  | "soltsy"
  | "khvoynaya";

export type Facility = {
  id: FacilityId;
  name: string;
  level: "I" | "II" | "III";
  role: string;
  address: string;
};

type Territory = {
  name: string;
  level2: FacilityId;
  level3?: FacilityId;
};

export type FormState = {
  ageGroup?: AgeGroup;
  locationKind?: LocationKind;
  territory?: string;
  m10Zone?: M10Zone;
  m11Responder?: M11Responder;
  m11Zone?: M11Zone;
  injuryCriterion?: InjuryCriterion;
};

export type RoutingResult = {
  title: string;
  urgency: string;
  target: Facility;
  targetLabel: string;
  nextTarget?: Facility;
  nextTargetLabel?: string;
  rationale: string[];
  actions: string[];
  handoff: string[];
  warnings: string[];
  sourceReference: string;
};

const LEGACY_FACILITIES: Record<FacilityId, Facility> = {
  nokb: {
    id: "nokb",
    name: "ГОБУЗ «Новгородская областная клиническая больница»",
    level: "I",
    role: "Профильный центр для подростков старше 15 лет и взрослых",
    address: "Великий Новгород, ул. Павла Левитта, д. 14",
  },
  odkb: {
    id: "odkb",
    name: "ГОБУЗ «Областная детская клиническая больница»",
    level: "I",
    role: "Профильный детский центр для пациентов от 0 до 15 лет",
    address: "Великий Новгород, ул. Державина, д. 1",
  },
  cgkb1: {
    id: "cgkb1",
    name: "ГОБУЗ «Центральная городская клиническая больница», Клиника № 1",
    level: "II",
    role: "Новгородская зона ответственности",
    address: "Великий Новгород, ул. Зелинского, д. 11",
  },
  borovichi: {
    id: "borovichi",
    name: "ГОБУЗ «Боровичская центральная районная больница»",
    level: "II",
    role: "Боровичская зона ответственности",
    address: "г. Боровичи, пл. 1 Мая, д. 2А",
  },
  staraya_russa: {
    id: "staraya_russa",
    name: "ГОБУЗ «Старорусская центральная районная больница»",
    level: "II",
    role: "Старорусская зона ответственности",
    address: "г. Старая Русса, ул. Гостинодворская, д. 50",
  },
  valdai: {
    id: "valdai",
    name: "Валдайский ММЦ ФГБУ СЗОНКЦ им. Л. Г. Соколова ФМБА России",
    level: "II",
    role: "Валдайская зона; госпитализация по согласованию",
    address: "г. Валдай, ул. Песчаная, д. 1А",
  },
  kresttsy: {
    id: "kresttsy",
    name: "ГОБУЗ «Крестецкая центральная районная больница»",
    level: "III",
    role: "Только для предусмотренного приказом первого этапа",
    address: "р. п. Крестцы, ул. Гагарина, д. 2",
  },
  chudovo: {
    id: "chudovo",
    name: "ГОБУЗ «Чудовская центральная районная больница»",
    level: "III",
    role: "Только для предусмотренного приказом первого этапа",
    address: "г. Чудово, ул. Косинова, д. 6",
  },
  demyansk: {
    id: "demyansk",
    name: "ГОБУЗ «Демянская центральная районная больница»",
    level: "III",
    role: "Только для предусмотренного приказом первого этапа",
    address: "п. Демянск; принимающий корпус и въезд подтвердить диспетчером",
  },
  zarubino: {
    id: "zarubino",
    name: "ГОБУЗ «Зарубинская центральная районная больница»",
    level: "III",
    role: "Только для предусмотренного приказом первого этапа",
    address: "п. Зарубино; принимающий корпус и въезд подтвердить диспетчером",
  },
  malaya_vishera: {
    id: "malaya_vishera",
    name: "ГОБУЗ «Маловишерская центральная районная больница»",
    level: "III",
    role: "Только для предусмотренного приказом первого этапа",
    address: "г. Малая Вишера, 2-й Набережный пер., д. 20",
  },
  okulovka: {
    id: "okulovka",
    name: "ГОБУЗ «Окуловская центральная районная больница»",
    level: "III",
    role: "Только для предусмотренного приказом первого этапа",
    address: "г. Окуловка, ул. Калинина, д. 129",
  },
  pestovo: {
    id: "pestovo",
    name: "ГОБУЗ «Пестовская центральная районная больница»",
    level: "III",
    role: "Только для предусмотренного приказом первого этапа",
    address: "г. Пестово, ул. Курганная, д. 18",
  },
  soltsy: {
    id: "soltsy",
    name: "ГОБУЗ «Солецкая центральная районная больница»",
    level: "III",
    role: "Только для предусмотренного приказом первого этапа",
    address: "г. Сольцы; принимающий корпус и въезд подтвердить диспетчером",
  },
  khvoynaya: {
    id: "khvoynaya",
    name: "ГОБУЗ «Хвойнинская центральная районная больница»",
    level: "III",
    role: "Только для предусмотренного приказом первого этапа",
    address: "р. п. Хвойная; принимающий корпус и въезд подтвердить диспетчером",
  },
};

const LEGACY_TERRITORIES: Territory[] = [
  { name: "Великий Новгород", level2: "cgkb1" },
  { name: "Новгородский район", level2: "cgkb1" },
  { name: "Батецкий район", level2: "cgkb1" },
  { name: "Шимский район", level2: "cgkb1" },
  { name: "Маловишерский район", level2: "cgkb1", level3: "malaya_vishera" },
  { name: "Чудовский район", level2: "cgkb1", level3: "chudovo" },
  { name: "Солецкий округ", level2: "cgkb1", level3: "soltsy" },
  { name: "Боровичский район", level2: "borovichi" },
  { name: "Любытинский район", level2: "borovichi", level3: "zarubino" },
  { name: "Хвойнинский округ", level2: "borovichi", level3: "khvoynaya" },
  { name: "Пестовский район", level2: "borovichi", level3: "pestovo" },
  { name: "Мошенской район", level2: "borovichi" },
  { name: "Окуловский район", level2: "borovichi", level3: "okulovka" },
  { name: "Старорусский район", level2: "staraya_russa" },
  { name: "Парфинский район", level2: "staraya_russa" },
  { name: "Поддорский район", level2: "staraya_russa" },
  { name: "Холмский район", level2: "staraya_russa" },
  { name: "Волотовский округ", level2: "staraya_russa" },
  { name: "Валдайский район", level2: "valdai" },
  { name: "Крестецкий район", level2: "valdai", level3: "kresttsy" },
  { name: "Демянский район", level2: "valdai", level3: "demyansk" },
  { name: "Марёвский округ", level2: "valdai" },
];

const LEGACY_AGE_LABELS: Record<AgeGroup, string> = {
  child_0_15: "Ребёнок от 0 до 15 лет включительно",
  age_16_17: "Подросток 16–17 лет",
  adult_18_plus: "Взрослый, 18 лет и старше",
};

const LEGACY_INJURY_LABELS: Record<InjuryCriterion, string> = {
  severe_tbi_or_shock:
    "Тяжёлая ЧМТ, травматический шок или тяжёлая сочетанная/множественная травма",
  specialized_injury:
    "Повреждение позвоночника/спинного мозга, нервно-сосудистого пучка, лица/шеи, отрыв конечности, повреждение мочевых путей или внутренних органов",
  other_without_shock: "Другая травма без шока и без перечисленных признаков",
  stable_isolated_limb:
    "Изолированная травма конечности, гемодинамика стабильна, пациент транспортабелен",
  life_saving_10_20:
    "Нужна жизнеспасающая операция в ближайшие 10–20 минут, а немедленная доставка в травмоцентр I/II уровня невозможна",
};

const LEGACY_M11_RESPONDER_LABELS: Record<M11Responder, string> = {
  novgorod_smp: "ГОБУЗ «Новгородская станция скорой медицинской помощи»",
  nokb_cmk: "Центр медицины катастроф ГОБУЗ «НОКБ»",
  valdai_mmc: "Валдайский многопрофильный медицинский центр (по согласованию)",
};

const LEGACY_M11_ZONES: Record<M11Responder, Array<{ value: M11Zone; label: string }>> = {
  novgorod_smp: [
    { value: "570_474", label: "М-11: от 570-го до 474-го км" },
    { value: "474_389", label: "М-11: от 474-го до 389-го км" },
  ],
  nokb_cmk: [{ value: "570_389", label: "М-11: от 570-го до 389-го км" }],
  valdai_mmc: [{ value: "389_444", label: "М-11: от 389-го до 444-го км" }],
};

export const TERRITORIES = ROAD_ACCIDENT_TERRITORIES_V1;
export const AGE_LABELS: Readonly<Record<AgeGroup, string>> =
  ROAD_ACCIDENT_AGE_LABELS_V1;
export const INJURY_LABELS: Readonly<Record<InjuryCriterion, string>> =
  ROAD_ACCIDENT_INJURY_LABELS_V1;
export const M11_RESPONDER_LABELS: Readonly<Record<M11Responder, string>> =
  ROAD_ACCIDENT_M11_RESPONDER_LABELS_V1;
export const M11_ZONES = ROAD_ACCIDENT_M11_ZONES_V1;

const REGIONAL_SOURCE =
  "Приказ Министерства здравоохранения Новгородской области от 21.11.2023 № 1360-Д «Об организации оказания медицинской помощи пострадавшим при дорожно-транспортных происшествиях, произошедших на территории Новгородской области»";

function adultLevelOne(ageGroup: AgeGroup): Facility {
  return ageGroup === "child_0_15"
    ? LEGACY_FACILITIES.odkb
    : LEGACY_FACILITIES.nokb;
}

function levelTwoForTerritory(territory: Territory, ageGroup: AgeGroup): Facility {
  if (territory.level2 === "valdai") {
    if (ageGroup === "child_0_15") return LEGACY_FACILITIES.odkb;
    if (ageGroup === "age_16_17") return LEGACY_FACILITIES.nokb;
  }
  return LEGACY_FACILITIES[territory.level2];
}

function commonHandoff(state: FormState): string[] {
  return [
    `Возрастная группа: ${state.ageGroup ? LEGACY_AGE_LABELS[state.ageGroup] : "не указана"}.`,
    `Характер травмы: ${state.injuryCriterion ? LEGACY_INJURY_LABELS[state.injuryCriterion] : "не указан"}.`,
    "Показатели сознания, дыхания и гемодинамики; признаки ЧМТ и шока в динамике.",
    "Механизм травмы, время ДТП, выявленные повреждения и выполненные мероприятия.",
  ];
}

function evaluateM11(state: FormState): RoutingResult | null {
  if (
    !state.ageGroup ||
    !state.injuryCriterion ||
    !state.m11Responder ||
    !state.m11Zone
  ) {
    return null;
  }

  const severe = state.injuryCriterion === "severe_tbi_or_shock";
  let target: Facility;

  if (state.m11Responder === "nokb_cmk") {
    target = adultLevelOne(state.ageGroup);
  } else if (
    state.m11Responder === "novgorod_smp" &&
    state.m11Zone === "570_474"
  ) {
    target = adultLevelOne(state.ageGroup);
  } else if (
    state.m11Responder === "novgorod_smp" &&
    state.m11Zone === "474_389"
  ) {
    target = state.ageGroup === "child_0_15" && severe
      ? LEGACY_FACILITIES.odkb
      : LEGACY_FACILITIES.borovichi;
  } else {
    target = state.ageGroup === "child_0_15"
      ? severe
        ? LEGACY_FACILITIES.odkb
        : LEGACY_FACILITIES.borovichi
      : LEGACY_FACILITIES.valdai;
  }

  return {
    title: "Маршрут по специальной таблице для М-11 «Нева»",
    urgency: "Экстренно, с уведомлением принимающего травмоцентра",
    target,
    targetLabel: "Место госпитализации",
    rationale: [
      `Ответственная организация: ${LEGACY_M11_RESPONDER_LABELS[state.m11Responder]}.`,
      `Зона: ${LEGACY_M11_ZONES[state.m11Responder].find((zone) => zone.value === state.m11Zone)?.label ?? state.m11Zone}.`,
      severe
        ? "Выбрано наличие тяжёлой ЧМТ и/или травматического шока."
        : "Тяжёлая ЧМТ и травматический шок не выбраны.",
    ],
    actions: [
      "Немедленно уведомить выбранный травмоцентр и подтвердить готовность приёма.",
      "При чрезвычайной ситуации или крупном ДТП обеспечить взаимодействие с Центром медицины катастроф, включая возможность авиационной эвакуации.",
      "Поддерживать жизненно важные функции во время транспортировки.",
    ],
    handoff: commonHandoff(state),
    warnings:
      state.m11Responder === "valdai_mmc" && state.ageGroup === "age_16_17"
        ? [
            "Требуется верификация Минздрава: приложение № 6 направляет в Валдайский ММЦ подростков старше 15 лет, тогда как приложение № 7 содержит пометку о ВММЦ «только с 18 лет».",
          ]
        : [],
    sourceReference: `${REGIONAL_SOURCE}; приложение № 6, страницы 12–13.`,
  };
}

function evaluateM10(state: FormState): RoutingResult | null {
  if (!state.ageGroup || !state.injuryCriterion || !state.m10Zone) return null;

  const child = state.ageGroup === "child_0_15";
  const needsHigherLevel =
    state.injuryCriterion === "severe_tbi_or_shock" ||
    state.injuryCriterion === "specialized_injury";
  const target = child
    ? LEGACY_FACILITIES.odkb
    : state.m10Zone === "valdai_kresttsy" && state.ageGroup === "adult_18_plus"
      ? LEGACY_FACILITIES.valdai
      : state.m10Zone === "zaytsevo_novgorod_chudovo" && !needsHigherLevel
        ? LEGACY_FACILITIES.cgkb1
        : LEGACY_FACILITIES.nokb;

  return {
    title: "Маршрут по зоне ответственности М-10 «Россия»",
    urgency: "Экстренно",
    target,
    targetLabel: "Профильный травмоцентр",
    rationale: [
      state.m10Zone === "valdai_kresttsy"
        ? "Участок Валдайского района и Крестецкого района до населённого пункта Зайцево относится к Валдайской зоне."
        : "Участок от населённого пункта Зайцево через Новгородский и Чудовский районы относится к Новгородской зоне.",
      child
        ? "Для ребёнка 0–15 лет приоритетным травмоцентром I уровня является Областная детская клиническая больница."
        : "Маршрут выбран с учётом взрослой возрастной группы и зоны федеральной трассы.",
    ],
    actions: [
      "Уведомить принимающий травмоцентр и подтвердить маршрут через диспетчера.",
      "Оценить минимальную транспортную доступность и необходимость специализированной реанимационной бригады класса C.",
      "При ухудшении состояния повторно согласовать этапность медицинской эвакуации.",
    ],
    handoff: commonHandoff(state),
    warnings:
      [
        ...(state.m10Zone === "valdai_kresttsy" && state.ageGroup === "age_16_17"
          ? [
              "Валдайский ММЦ в общей таблице приложения № 7 указан для пациентов с 18 лет; для возраста 16–17 лет показан маршрут в НОКБ.",
            ]
          : []),
        ...(state.injuryCriterion === "life_saving_10_20"
          ? [
              "Для операции в течение 10–20 минут одного выбора зоны М-10 недостаточно: конкретный ближайший травмоцентр III уровня или операционную необходимо определить диспетчеру по точке ДТП и времени доезда.",
            ]
          : []),
      ],
    sourceReference: `${REGIONAL_SOURCE}; приложения № 5 и № 7, страницы 11 и 14–17.`,
  };
}

function evaluateTerritory(state: FormState): RoutingResult | null {
  if (!state.ageGroup || !state.injuryCriterion || !state.territory) return null;
  const territory = LEGACY_TERRITORIES.find((item) => item.name === state.territory);
  if (!territory) return null;

  const levelOne = adultLevelOne(state.ageGroup);
  const levelTwo = levelTwoForTerritory(territory, state.ageGroup);
  const localLevelThree = territory.level3
    ? LEGACY_FACILITIES[territory.level3]
    : undefined;

  if (
    (state.injuryCriterion === "life_saving_10_20" ||
      state.injuryCriterion === "stable_isolated_limb") &&
    localLevelThree
  ) {
    return {
      title: "Этапный маршрут через травмоцентр III уровня",
      urgency:
        state.injuryCriterion === "life_saving_10_20"
          ? "Немедленно"
          : "Экстренно",
      target: localLevelThree,
      targetLabel: "Первый этап",
      nextTarget: levelTwo,
      nextTargetLabel: "После стабилизации — травмоцентр II уровня своей зоны",
      rationale: [
        state.injuryCriterion === "life_saving_10_20"
          ? "Травмоцентр III уровня допускается, когда требуется жизнеспасающая операция в течение 10–20 минут и немедленная доставка в центр I/II уровня невозможна."
          : "Травмоцентр III уровня может принять стабильного пациента с изолированной травмой конечности.",
        "При наличии показаний дальнейший перевод выполняется в травмоцентр более высокого уровня.",
      ],
      actions: [
        "Подтвердить готовность травмоцентра III уровня и одновременно уведомить травмоцентр II уровня своей зоны.",
        "После устранения непосредственной угрозы согласовать перевод; оптимально — в первые 24 часа с момента доставки в стационар.",
        "Для межбольничной эвакуации тяжёлого пациента использовать реанимационную бригаду и автомобиль класса C.",
      ],
      handoff: commonHandoff(state),
      warnings: [
        "Травмоцентр III уровня не является обычным конечным пунктом для тяжёлой сочетанной или множественной травмы.",
      ],
      sourceReference: `${REGIONAL_SOURCE}; приложения № 4, № 7 и № 8, страницы 10 и 14–18.`,
    };
  }

  if (state.injuryCriterion === "life_saving_10_20" && !localLevelThree) {
    return {
      title: "Нужна немедленная жизнеспасающая помощь",
      urgency: "Немедленно",
      target: levelTwo,
      targetLabel: "Ближайший закреплённый травмоцентр II уровня",
      nextTarget: levelOne,
      nextTargetLabel: "Травмоцентр I уровня — при показаниях после стабилизации",
      rationale: [
        "Для выбранной территории приказ не показывает отдельный травмоцентр III уровня в приложении № 4.",
        "Конкретную ближайшую точку для операции в течение 10–20 минут необходимо подтвердить диспетчером.",
      ],
      actions: [
        "Немедленно согласовать ближайшую доступную операционную и готовность травматологической/хирургической бригады.",
        "Одновременно уведомить травмоцентр более высокого уровня о вероятной последующей эвакуации.",
      ],
      handoff: commonHandoff(state),
      warnings: [
        "Нормативный пробел для интерфейса: приказ не содержит оперативной таблицы доступности операционных и времени доезда.",
      ],
      sourceReference: `${REGIONAL_SOURCE}; приложения № 4 и № 7, страницы 10 и 14–17.`,
    };
  }

  const childHighRisk =
    state.ageGroup === "child_0_15" &&
    (state.injuryCriterion === "severe_tbi_or_shock" ||
      state.injuryCriterion === "specialized_injury");

  const target = childHighRisk ? LEGACY_FACILITIES.odkb : levelTwo;
  const needsHigherLevel =
    state.injuryCriterion === "severe_tbi_or_shock" ||
    state.injuryCriterion === "specialized_injury";
  const nextTarget = target.id === levelOne.id || !needsHigherLevel
    ? undefined
    : levelOne;

  return {
    title: childHighRisk
      ? "Прямая детская маршрутизация в травмоцентр I уровня"
      : "Маршрут в травмоцентр закреплённой зоны",
    urgency: "Экстренно",
    target,
    targetLabel: "Первичное место госпитализации",
    nextTarget,
    nextTargetLabel: nextTarget
      ? "Травмоцентр I уровня — при показаниях к медицинской эвакуации"
      : undefined,
    rationale: [
      childHighRisk
        ? "Ребёнок 0–15 лет с тяжёлой или требующей специализированной помощи травмой направляется в Областную детскую клиническую больницу."
        : `По территориальной схеме первый профильный центр — ${levelTwo.name}.`,
      needsHigherLevel
        ? "Выбранная травма относится к группе, для которой необходимо раннее уведомление травмоцентра более высокого уровня."
        : "Признаки шока и повреждения, требующие центра более высокого уровня, не выбраны.",
    ],
    actions: [
      "Уведомить принимающий травмоцентр и подтвердить готовность приёма.",
      ...(needsHigherLevel
        ? [
            "Передать сведения в травмоцентр I уровня и согласовать необходимость прямой доставки либо последующего перевода.",
            "При межбольничной эвакуации тяжёлого пациента использовать реанимационную бригаду и автомобиль класса C.",
          ]
        : []),
      "Выбор между центрами I и II уровня уточняется по тяжести, профилю повреждений и минимальной транспортной доступности.",
    ],
    handoff: commonHandoff(state),
    warnings: [
      "Немедленная межбольничная транспортировка противопоказана при нестабильной гемодинамике и признаках нарастания отёка/дислокации головного мозга — сначала требуется стабилизация.",
    ],
    sourceReference: `${REGIONAL_SOURCE}; приложения № 7–9, страницы 14–20.`,
  };
}

export function evaluateRoutingLegacy(state: FormState): RoutingResult | null {
  if (!state.locationKind) return null;
  if (state.locationKind === "m11") return evaluateM11(state);
  if (state.locationKind === "m10") return evaluateM10(state);
  return evaluateTerritory(state);
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
    (value.level === "I" || value.level === "II" || value.level === "III") &&
    typeof value.role === "string" &&
    typeof value.address === "string"
  );
}

function optionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function routingResultFromRules(value: unknown): RoutingResult {
  if (
    !isRecord(value) ||
    typeof value.title !== "string" ||
    typeof value.urgency !== "string" ||
    !isFacility(value.target) ||
    typeof value.targetLabel !== "string" ||
    (value.nextTarget !== undefined && !isFacility(value.nextTarget)) ||
    !optionalString(value.nextTargetLabel) ||
    !isStringArray(value.rationale) ||
    !isStringArray(value.actions) ||
    !isStringArray(value.handoff) ||
    !isStringArray(value.warnings) ||
    typeof value.sourceReference !== "string"
  ) {
    throw new Error("rules_v1 вернул некорректный результат профиля ДТП.");
  }
  return value as RoutingResult;
}

export function evaluateRoutingRulesV1(
  state: FormState,
): RoutingResult | null {
  const evaluation = evaluateRoutingRuleSetV1(
    ROAD_ACCIDENT_RULE_SET_V1,
    state,
  );
  return evaluation ? routingResultFromRules(evaluation.result) : null;
}

export function evaluateRouting(state: FormState): RoutingResult | null {
  return evaluateRoutingRulesV1(state);
}

export const roadAccidentRoutingProfile = {
  id: "road_accident",
  title: "ДТП / травма",
  description: "Место ДТП → возраст → тяжесть → травмоцентр и этап эвакуации",
  content: roadAccidentRoutingContent,
  evaluate: evaluateRouting,
} satisfies RoutingProfileDefinition<FormState, RoutingResult>;
