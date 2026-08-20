import type {
  RoutingConditionV1,
  RoutingRuleSetV1,
  RoutingTemplateV1,
} from "./rules-v1.js";

export const ROAD_ACCIDENT_FACILITIES_V1 = {
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
} as const;

export const ROAD_ACCIDENT_TERRITORIES_V1 = [
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
] as const;

export const ROAD_ACCIDENT_AGE_LABELS_V1 = {
  child_0_15: "Ребёнок от 0 до 15 лет включительно",
  age_16_17: "Подросток 16–17 лет",
  adult_18_plus: "Взрослый, 18 лет и старше",
} as const;

export const ROAD_ACCIDENT_INJURY_LABELS_V1 = {
  severe_tbi_or_shock:
    "Тяжёлая ЧМТ, травматический шок или тяжёлая сочетанная/множественная травма",
  specialized_injury:
    "Повреждение позвоночника/спинного мозга, нервно-сосудистого пучка, лица/шеи, отрыв конечности, повреждение мочевых путей или внутренних органов",
  other_without_shock: "Другая травма без шока и без перечисленных признаков",
  stable_isolated_limb:
    "Изолированная травма конечности, гемодинамика стабильна, пациент транспортабелен",
  life_saving_10_20:
    "Нужна жизнеспасающая операция в ближайшие 10–20 минут, а немедленная доставка в травмоцентр I/II уровня невозможна",
} as const;

export const ROAD_ACCIDENT_M11_RESPONDER_LABELS_V1 = {
  novgorod_smp: "ГОБУЗ «Новгородская станция скорой медицинской помощи»",
  nokb_cmk: "Центр медицины катастроф ГОБУЗ «НОКБ»",
  valdai_mmc: "Валдайский многопрофильный медицинский центр (по согласованию)",
} as const;

export const ROAD_ACCIDENT_M11_ZONES_V1 = {
  novgorod_smp: [
    { value: "570_474", label: "М-11: от 570-го до 474-го км" },
    { value: "474_389", label: "М-11: от 474-го до 389-го км" },
  ],
  nokb_cmk: [{ value: "570_389", label: "М-11: от 570-го до 389-го км" }],
  valdai_mmc: [{ value: "389_444", label: "М-11: от 389-го до 444-го км" }],
} as const;

const REGIONAL_SOURCE =
  "Приказ Министерства здравоохранения Новгородской области от 21.11.2023 № 1360-Д «Об организации оказания медицинской помощи пострадавшим при дорожно-транспортных происшествиях, произошедших на территории Новгородской области»";

const AGE_GROUPS = Object.keys(ROAD_ACCIDENT_AGE_LABELS_V1);
const INJURY_CRITERIA = Object.keys(ROAD_ACCIDENT_INJURY_LABELS_V1);
const M10_ZONES = ["valdai_kresttsy", "zaytsevo_novgorod_chudovo"] as const;
const M11_RESPONDERS = Object.keys(
  ROAD_ACCIDENT_M11_RESPONDER_LABELS_V1,
) as Array<keyof typeof ROAD_ACCIDENT_M11_RESPONDER_LABELS_V1>;
const M11_ZONE_VALUES = ["570_474", "474_389", "570_389", "389_444"] as const;
const TERRITORY_NAMES = ROAD_ACCIDENT_TERRITORIES_V1.map(({ name }) => name);
const TERRITORIES_WITH_LEVEL_THREE = ROAD_ACCIDENT_TERRITORIES_V1.filter(
  (territory) => "level3" in territory,
).map(({ name }) => name);
const TERRITORIES_WITHOUT_LEVEL_THREE = ROAD_ACCIDENT_TERRITORIES_V1.filter(
  (territory) => !("level3" in territory),
).map(({ name }) => name);
const VALDAI_LEVEL_TWO_TERRITORIES = ROAD_ACCIDENT_TERRITORIES_V1.filter(
  (territory) => territory.level2 === "valdai",
).map(({ name }) => name);

const facility = (id: keyof typeof ROAD_ACCIDENT_FACILITIES_V1) =>
  ROAD_ACCIDENT_FACILITIES_V1[id];

function levelOneForAge(ageGroup: string) {
  return ageGroup === "child_0_15" ? facility("odkb") : facility("nokb");
}

function levelTwoForTerritory(
  territory: (typeof ROAD_ACCIDENT_TERRITORIES_V1)[number],
  ageGroup: string,
) {
  if (territory.level2 === "valdai") {
    if (ageGroup === "child_0_15") return facility("odkb");
    if (ageGroup === "age_16_17") return facility("nokb");
  }
  return facility(territory.level2);
}

const LEVEL_ONE_TARGETS = Object.fromEntries(
  AGE_GROUPS.map((ageGroup) => [ageGroup, levelOneForAge(ageGroup)]),
) as Record<string, RoutingTemplateV1>;

const TERRITORY_LEVEL_TWO_TARGETS = Object.fromEntries(
  ROAD_ACCIDENT_TERRITORIES_V1.flatMap((territory) =>
    AGE_GROUPS.map((ageGroup) => [
      `${territory.name}|${ageGroup}`,
      levelTwoForTerritory(territory, ageGroup),
    ]),
  ),
) as Record<string, RoutingTemplateV1>;

const TERRITORY_LEVEL_THREE_TARGETS = Object.fromEntries(
  ROAD_ACCIDENT_TERRITORIES_V1.filter(
    (territory): territory is typeof territory & { level3: keyof typeof ROAD_ACCIDENT_FACILITIES_V1 } =>
      "level3" in territory,
  ).map((territory) => [territory.name, facility(territory.level3)]),
) as Record<string, RoutingTemplateV1>;

const M11_ZONE_LABELS: Record<string, RoutingTemplateV1> = {};
const M11_TARGETS: Record<string, RoutingTemplateV1> = {};
const M11_WARNINGS: Record<string, RoutingTemplateV1> = {};

for (const responder of M11_RESPONDERS) {
  for (const zone of M11_ZONE_VALUES) {
    const configuredZone = ROAD_ACCIDENT_M11_ZONES_V1[responder].find(
      (item) => item.value === zone,
    );
    M11_ZONE_LABELS[`${responder}|${zone}`] = configuredZone?.label ?? zone;

    for (const ageGroup of AGE_GROUPS) {
      for (const injuryCriterion of INJURY_CRITERIA) {
        const severe = injuryCriterion === "severe_tbi_or_shock";
        let target = facility("valdai");
        if (responder === "nokb_cmk") {
          target = levelOneForAge(ageGroup);
        } else if (responder === "novgorod_smp" && zone === "570_474") {
          target = levelOneForAge(ageGroup);
        } else if (responder === "novgorod_smp" && zone === "474_389") {
          target = ageGroup === "child_0_15" && severe
            ? facility("odkb")
            : facility("borovichi");
        } else {
          target = ageGroup === "child_0_15"
            ? severe
              ? facility("odkb")
              : facility("borovichi")
            : facility("valdai");
        }
        M11_TARGETS[`${responder}|${zone}|${ageGroup}|${injuryCriterion}`] = target;
      }
    }
  }

  for (const ageGroup of AGE_GROUPS) {
    M11_WARNINGS[`${responder}|${ageGroup}`] =
      responder === "valdai_mmc" && ageGroup === "age_16_17"
        ? [
            "Требуется верификация Минздрава: приложение № 6 направляет в Валдайский ММЦ подростков старше 15 лет, тогда как приложение № 7 содержит пометку о ВММЦ «только с 18 лет».",
          ]
        : [];
  }
}

const M10_TARGETS: Record<string, RoutingTemplateV1> = {};
const M10_WARNINGS: Record<string, RoutingTemplateV1> = {};
for (const zone of M10_ZONES) {
  for (const ageGroup of AGE_GROUPS) {
    for (const injuryCriterion of INJURY_CRITERIA) {
      const child = ageGroup === "child_0_15";
      const needsHigherLevel =
        injuryCriterion === "severe_tbi_or_shock" ||
        injuryCriterion === "specialized_injury";
      const target = child
        ? facility("odkb")
        : zone === "valdai_kresttsy" && ageGroup === "adult_18_plus"
          ? facility("valdai")
          : zone === "zaytsevo_novgorod_chudovo" && !needsHigherLevel
            ? facility("cgkb1")
            : facility("nokb");
      M10_TARGETS[`${zone}|${ageGroup}|${injuryCriterion}`] = target;
      M10_WARNINGS[`${zone}|${ageGroup}|${injuryCriterion}`] = [
        ...(zone === "valdai_kresttsy" && ageGroup === "age_16_17"
          ? [
              "Валдайский ММЦ в общей таблице приложения № 7 указан для пациентов с 18 лет; для возраста 16–17 лет показан маршрут в НОКБ.",
            ]
          : []),
        ...(injuryCriterion === "life_saving_10_20"
          ? [
              "Для операции в течение 10–20 минут одного выбора зоны М-10 недостаточно: конкретный ближайший травмоцентр III уровня или операционную необходимо определить диспетчеру по точке ДТП и времени доезда.",
            ]
          : []),
      ];
    }
  }
}

const VALID_AGE: RoutingConditionV1 = {
  op: "in",
  field: "ageGroup",
  values: AGE_GROUPS,
};
const VALID_INJURY: RoutingConditionV1 = {
  op: "in",
  field: "injuryCriterion",
  values: INJURY_CRITERIA,
};
const VALID_TERRITORY: RoutingConditionV1 = {
  op: "in",
  field: "territory",
  values: TERRITORY_NAMES,
};

const catalog = (catalogId: string, key: RoutingTemplateV1) => ({
  $catalog: catalogId,
  key,
}) as const;
const joinedKey = (...fields: string[]) => ({
  $concat: fields.flatMap((field, index) => [
    ...(index === 0 ? [] : ["|"]),
    { $field: field },
  ]),
}) as const;

const COMMON_HANDOFF: RoutingTemplateV1[] = [
  {
    $concat: [
      "Возрастная группа: ",
      catalog("ageLabels", { $field: "ageGroup" }),
      ".",
    ],
  },
  {
    $concat: [
      "Характер травмы: ",
      catalog("injuryLabels", { $field: "injuryCriterion" }),
      ".",
    ],
  },
  "Показатели сознания, дыхания и гемодинамики; признаки ЧМТ и шока в динамике.",
  "Механизм травмы, время ДТП, выявленные повреждения и выполненные мероприятия.",
];

const TERRITORY_COMMON_WARNING = [
  "Немедленная межбольничная транспортировка противопоказана при нестабильной гемодинамике и признаках нарастания отёка/дислокации головного мозга — сначала требуется стабилизация.",
];

function territoryLevelTwoTarget() {
  return catalog("territoryLevelTwoTargets", joinedKey("territory", "ageGroup"));
}

function territoryGeneralResult(
  options: { childHighRisk?: boolean; withNextTarget?: boolean; highRisk?: boolean },
): RoutingTemplateV1 {
  const highRisk = options.highRisk ?? options.childHighRisk ?? false;
  return {
    title: options.childHighRisk
      ? "Прямая детская маршрутизация в травмоцентр I уровня"
      : "Маршрут в травмоцентр закреплённой зоны",
    urgency: "Экстренно",
    target: options.childHighRisk
      ? catalog("facilities", "odkb")
      : territoryLevelTwoTarget(),
    targetLabel: "Первичное место госпитализации",
    ...(options.withNextTarget
      ? {
          nextTarget: catalog("facilities", "nokb"),
          nextTargetLabel:
            "Травмоцентр I уровня — при показаниях к медицинской эвакуации",
        }
      : {}),
    rationale: [
      options.childHighRisk
        ? "Ребёнок 0–15 лет с тяжёлой или требующей специализированной помощи травмой направляется в Областную детскую клиническую больницу."
        : {
            $concat: [
              "По территориальной схеме первый профильный центр — ",
              catalog("territoryLevelTwoNames", joinedKey("territory", "ageGroup")),
              ".",
            ],
          },
      highRisk
        ? "Выбранная травма относится к группе, для которой необходимо раннее уведомление травмоцентра более высокого уровня."
        : "Признаки шока и повреждения, требующие центра более высокого уровня, не выбраны.",
    ],
    actions: [
      "Уведомить принимающий травмоцентр и подтвердить готовность приёма.",
      ...(highRisk
        ? [
            "Передать сведения в травмоцентр I уровня и согласовать необходимость прямой доставки либо последующего перевода.",
            "При межбольничной эвакуации тяжёлого пациента использовать реанимационную бригаду и автомобиль класса C.",
          ]
        : []),
      "Выбор между центрами I и II уровня уточняется по тяжести, профилю повреждений и минимальной транспортной доступности.",
    ],
    handoff: COMMON_HANDOFF,
    warnings: TERRITORY_COMMON_WARNING,
    sourceReference: `${REGIONAL_SOURCE}; приложения № 7–9, страницы 14–20.`,
  };
}

const TERRITORY_LEVEL_TWO_NAMES = Object.fromEntries(
  Object.entries(TERRITORY_LEVEL_TWO_TARGETS).map(([key, target]) => [
    key,
    (target as { name: string }).name,
  ]),
) as Record<string, RoutingTemplateV1>;

export const ROAD_ACCIDENT_RULE_SET_V1 = {
  schemaVersion: 1,
  id: "road-accident.v1",
  profileId: "road_accident",
  catalogs: {
    facilities: ROAD_ACCIDENT_FACILITIES_V1,
    ageLabels: ROAD_ACCIDENT_AGE_LABELS_V1,
    injuryLabels: ROAD_ACCIDENT_INJURY_LABELS_V1,
    m11ResponderLabels: ROAD_ACCIDENT_M11_RESPONDER_LABELS_V1,
    m11ZoneLabels: M11_ZONE_LABELS,
    m11Targets: M11_TARGETS,
    m11Warnings: M11_WARNINGS,
    m11SeverityRationale: {
      severe_tbi_or_shock:
        "Выбрано наличие тяжёлой ЧМТ и/или травматического шока.",
      specialized_injury:
        "Тяжёлая ЧМТ и травматический шок не выбраны.",
      other_without_shock:
        "Тяжёлая ЧМТ и травматический шок не выбраны.",
      stable_isolated_limb:
        "Тяжёлая ЧМТ и травматический шок не выбраны.",
      life_saving_10_20:
        "Тяжёлая ЧМТ и травматический шок не выбраны.",
    },
    m10Targets: M10_TARGETS,
    m10Warnings: M10_WARNINGS,
    m10ZoneRationale: {
      valdai_kresttsy:
        "Участок Валдайского района и Крестецкого района до населённого пункта Зайцево относится к Валдайской зоне.",
      zaytsevo_novgorod_chudovo:
        "Участок от населённого пункта Зайцево через Новгородский и Чудовский районы относится к Новгородской зоне.",
    },
    m10AgeRationale: {
      child_0_15:
        "Для ребёнка 0–15 лет приоритетным травмоцентром I уровня является Областная детская клиническая больница.",
      age_16_17:
        "Маршрут выбран с учётом взрослой возрастной группы и зоны федеральной трассы.",
      adult_18_plus:
        "Маршрут выбран с учётом взрослой возрастной группы и зоны федеральной трассы.",
    },
    levelOneTargets: LEVEL_ONE_TARGETS,
    territoryLevelTwoTargets: TERRITORY_LEVEL_TWO_TARGETS,
    territoryLevelTwoNames: TERRITORY_LEVEL_TWO_NAMES,
    territoryLevelThreeTargets: TERRITORY_LEVEL_THREE_TARGETS,
  },
  rules: [
    {
      id: "m11",
      priority: 10,
      when: {
        op: "all",
        conditions: [
          { op: "eq", field: "locationKind", value: "m11" },
          VALID_AGE,
          VALID_INJURY,
          { op: "in", field: "m11Responder", values: M11_RESPONDERS },
          { op: "in", field: "m11Zone", values: M11_ZONE_VALUES },
        ],
      },
      result: {
        title: "Маршрут по специальной таблице для М-11 «Нева»",
        urgency: "Экстренно, с уведомлением принимающего травмоцентра",
        target: catalog(
          "m11Targets",
          joinedKey("m11Responder", "m11Zone", "ageGroup", "injuryCriterion"),
        ),
        targetLabel: "Место госпитализации",
        rationale: [
          {
            $concat: [
              "Ответственная организация: ",
              catalog("m11ResponderLabels", { $field: "m11Responder" }),
              ".",
            ],
          },
          {
            $concat: [
              "Зона: ",
              catalog("m11ZoneLabels", joinedKey("m11Responder", "m11Zone")),
              ".",
            ],
          },
          catalog("m11SeverityRationale", { $field: "injuryCriterion" }),
        ],
        actions: [
          "Немедленно уведомить выбранный травмоцентр и подтвердить готовность приёма.",
          "При чрезвычайной ситуации или крупном ДТП обеспечить взаимодействие с Центром медицины катастроф, включая возможность авиационной эвакуации.",
          "Поддерживать жизненно важные функции во время транспортировки.",
        ],
        handoff: COMMON_HANDOFF,
        warnings: catalog("m11Warnings", joinedKey("m11Responder", "ageGroup")),
        sourceReference: `${REGIONAL_SOURCE}; приложение № 6, страницы 12–13.`,
      },
    },
    {
      id: "m10",
      priority: 20,
      when: {
        op: "all",
        conditions: [
          { op: "eq", field: "locationKind", value: "m10" },
          VALID_AGE,
          VALID_INJURY,
          { op: "in", field: "m10Zone", values: M10_ZONES },
        ],
      },
      result: {
        title: "Маршрут по зоне ответственности М-10 «Россия»",
        urgency: "Экстренно",
        target: catalog(
          "m10Targets",
          joinedKey("m10Zone", "ageGroup", "injuryCriterion"),
        ),
        targetLabel: "Профильный травмоцентр",
        rationale: [
          catalog("m10ZoneRationale", { $field: "m10Zone" }),
          catalog("m10AgeRationale", { $field: "ageGroup" }),
        ],
        actions: [
          "Уведомить принимающий травмоцентр и подтвердить маршрут через диспетчера.",
          "Оценить минимальную транспортную доступность и необходимость специализированной реанимационной бригады класса C.",
          "При ухудшении состояния повторно согласовать этапность медицинской эвакуации.",
        ],
        handoff: COMMON_HANDOFF,
        warnings: catalog(
          "m10Warnings",
          joinedKey("m10Zone", "ageGroup", "injuryCriterion"),
        ),
        sourceReference: `${REGIONAL_SOURCE}; приложения № 5 и № 7, страницы 11 и 14–17.`,
      },
    },
    {
      id: "territory_level_three_life_saving",
      priority: 30,
      when: {
        op: "all",
        conditions: [
          { op: "eq", field: "locationKind", value: "territory" },
          VALID_TERRITORY,
          VALID_AGE,
          { op: "eq", field: "injuryCriterion", value: "life_saving_10_20" },
          { op: "in", field: "territory", values: TERRITORIES_WITH_LEVEL_THREE },
        ],
      },
      result: {
        title: "Этапный маршрут через травмоцентр III уровня",
        urgency: "Немедленно",
        target: catalog("territoryLevelThreeTargets", { $field: "territory" }),
        targetLabel: "Первый этап",
        nextTarget: territoryLevelTwoTarget(),
        nextTargetLabel: "После стабилизации — травмоцентр II уровня своей зоны",
        rationale: [
          "Травмоцентр III уровня допускается, когда требуется жизнеспасающая операция в течение 10–20 минут и немедленная доставка в центр I/II уровня невозможна.",
          "При наличии показаний дальнейший перевод выполняется в травмоцентр более высокого уровня.",
        ],
        actions: [
          "Подтвердить готовность травмоцентра III уровня и одновременно уведомить травмоцентр II уровня своей зоны.",
          "После устранения непосредственной угрозы согласовать перевод; оптимально — в первые 24 часа с момента доставки в стационар.",
          "Для межбольничной эвакуации тяжёлого пациента использовать реанимационную бригаду и автомобиль класса C.",
        ],
        handoff: COMMON_HANDOFF,
        warnings: [
          "Травмоцентр III уровня не является обычным конечным пунктом для тяжёлой сочетанной или множественной травмы.",
        ],
        sourceReference: `${REGIONAL_SOURCE}; приложения № 4, № 7 и № 8, страницы 10 и 14–18.`,
      },
    },
    {
      id: "territory_level_three_stable_limb",
      priority: 40,
      when: {
        op: "all",
        conditions: [
          { op: "eq", field: "locationKind", value: "territory" },
          VALID_TERRITORY,
          VALID_AGE,
          { op: "eq", field: "injuryCriterion", value: "stable_isolated_limb" },
          { op: "in", field: "territory", values: TERRITORIES_WITH_LEVEL_THREE },
        ],
      },
      result: {
        title: "Этапный маршрут через травмоцентр III уровня",
        urgency: "Экстренно",
        target: catalog("territoryLevelThreeTargets", { $field: "territory" }),
        targetLabel: "Первый этап",
        nextTarget: territoryLevelTwoTarget(),
        nextTargetLabel: "После стабилизации — травмоцентр II уровня своей зоны",
        rationale: [
          "Травмоцентр III уровня может принять стабильного пациента с изолированной травмой конечности.",
          "При наличии показаний дальнейший перевод выполняется в травмоцентр более высокого уровня.",
        ],
        actions: [
          "Подтвердить готовность травмоцентра III уровня и одновременно уведомить травмоцентр II уровня своей зоны.",
          "После устранения непосредственной угрозы согласовать перевод; оптимально — в первые 24 часа с момента доставки в стационар.",
          "Для межбольничной эвакуации тяжёлого пациента использовать реанимационную бригаду и автомобиль класса C.",
        ],
        handoff: COMMON_HANDOFF,
        warnings: [
          "Травмоцентр III уровня не является обычным конечным пунктом для тяжёлой сочетанной или множественной травмы.",
        ],
        sourceReference: `${REGIONAL_SOURCE}; приложения № 4, № 7 и № 8, страницы 10 и 14–18.`,
      },
    },
    {
      id: "territory_life_saving_without_level_three",
      priority: 50,
      when: {
        op: "all",
        conditions: [
          { op: "eq", field: "locationKind", value: "territory" },
          VALID_TERRITORY,
          VALID_AGE,
          { op: "eq", field: "injuryCriterion", value: "life_saving_10_20" },
          { op: "in", field: "territory", values: TERRITORIES_WITHOUT_LEVEL_THREE },
        ],
      },
      result: {
        title: "Нужна немедленная жизнеспасающая помощь",
        urgency: "Немедленно",
        target: territoryLevelTwoTarget(),
        targetLabel: "Ближайший закреплённый травмоцентр II уровня",
        nextTarget: catalog("levelOneTargets", { $field: "ageGroup" }),
        nextTargetLabel: "Травмоцентр I уровня — при показаниях после стабилизации",
        rationale: [
          "Для выбранной территории приказ не показывает отдельный травмоцентр III уровня в приложении № 4.",
          "Конкретную ближайшую точку для операции в течение 10–20 минут необходимо подтвердить диспетчером.",
        ],
        actions: [
          "Немедленно согласовать ближайшую доступную операционную и готовность травматологической/хирургической бригады.",
          "Одновременно уведомить травмоцентр более высокого уровня о вероятной последующей эвакуации.",
        ],
        handoff: COMMON_HANDOFF,
        warnings: [
          "Нормативный пробел для интерфейса: приказ не содержит оперативной таблицы доступности операционных и времени доезда.",
        ],
        sourceReference: `${REGIONAL_SOURCE}; приложения № 4 и № 7, страницы 10 и 14–17.`,
      },
    },
    {
      id: "territory_child_high_risk",
      priority: 60,
      when: {
        op: "all",
        conditions: [
          { op: "eq", field: "locationKind", value: "territory" },
          VALID_TERRITORY,
          { op: "eq", field: "ageGroup", value: "child_0_15" },
          {
            op: "in",
            field: "injuryCriterion",
            values: ["severe_tbi_or_shock", "specialized_injury"],
          },
        ],
      },
      result: territoryGeneralResult({ childHighRisk: true }),
    },
    {
      id: "territory_valdai_teen_high_risk",
      priority: 70,
      when: {
        op: "all",
        conditions: [
          { op: "eq", field: "locationKind", value: "territory" },
          { op: "in", field: "territory", values: VALDAI_LEVEL_TWO_TERRITORIES },
          { op: "eq", field: "ageGroup", value: "age_16_17" },
          {
            op: "in",
            field: "injuryCriterion",
            values: ["severe_tbi_or_shock", "specialized_injury"],
          },
        ],
      },
      result: territoryGeneralResult({ highRisk: true }),
    },
    {
      id: "territory_non_child_high_risk",
      priority: 80,
      when: {
        op: "all",
        conditions: [
          { op: "eq", field: "locationKind", value: "territory" },
          VALID_TERRITORY,
          { op: "in", field: "ageGroup", values: ["age_16_17", "adult_18_plus"] },
          {
            op: "in",
            field: "injuryCriterion",
            values: ["severe_tbi_or_shock", "specialized_injury"],
          },
        ],
      },
      result: territoryGeneralResult({ highRisk: true, withNextTarget: true }),
    },
    {
      id: "territory_other",
      priority: 90,
      when: {
        op: "all",
        conditions: [
          { op: "eq", field: "locationKind", value: "territory" },
          VALID_TERRITORY,
          VALID_AGE,
          {
            op: "in",
            field: "injuryCriterion",
            values: ["other_without_shock", "stable_isolated_limb"],
          },
        ],
      },
      result: territoryGeneralResult({}),
    },
  ],
} as const satisfies RoutingRuleSetV1;
