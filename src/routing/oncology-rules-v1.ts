import type {
  RoutingConditionV1,
  RoutingRuleSetV1,
  RoutingTemplateV1,
} from "./rules-v1.js";

export const ONCOLOGY_TERRITORY_GROUPS_V1 = {
  novgorod: [
    "Великий Новгород",
    "Новгородский",
    "Батецкий",
    "Крестецкий",
    "Маловишерский",
    "Солецкий",
    "Чудовский",
    "Шимский",
  ],
  staraya_russa: [
    "Старая Русса",
    "Старорусский",
    "Волотовский",
    "Демянский",
    "Марёвский",
    "Поддорский",
    "Холмский",
    "Парфинский",
  ],
  borovichi: [
    "Боровичи",
    "Боровичский",
    "Мошенской",
    "Окуловский",
    "Пестовский",
    "Любытинский",
    "Хвойнинский",
  ],
  valdai: ["Валдайский"],
} as const;

export const ONCOLOGY_TERRITORY_OPTIONS_V1 = Object.values(
  ONCOLOGY_TERRITORY_GROUPS_V1,
).flat().sort((left, right) => left.localeCompare(right, "ru"));

export const ONCOLOGY_GENERAL_EMERGENCY_SIGNS_V1 = [
  "altered_consciousness",
  "respiratory_failure",
  "circulatory_disorder",
  "active_bleeding",
  "massive_or_uncontrolled_bleeding",
  "acute_pain_emergency",
] as const;

export const ONCOLOGY_SURGICAL_SYNDROME_SIGNS_V1 = [
  "upper_airway_obstruction",
  "intestinal_obstruction_suspected",
  "severe_dysphagia_or_unable_to_feed",
  "tense_ascites",
  "pleural_effusion_with_dyspnea",
  "obstructive_jaundice_suspected",
  "dvt_suspected",
  "stoma_complication",
  "massive_or_uncontrolled_bleeding",
] as const;

export const ONCOLOGY_PALLIATIVE_SYMPTOM_SIGNS_V1 = [
  "uncontrolled_cancer_pain",
] as const;

export const ONCOLOGY_SIGN_LABELS_V1 = {
  altered_consciousness: "Нарушение сознания",
  respiratory_failure: "Нарушение дыхания",
  circulatory_disorder: "Нарушение системы кровообращения",
  active_bleeding: "Активное кровотечение",
  massive_or_uncontrolled_bleeding: "Массивное / неконтролируемое кровотечение",
  acute_pain_emergency: "Острая боль как неотложный синдром",
  mi_or_stroke_suspected: "Подозрение на инфаркт / ОНМК",
  upper_airway_obstruction:
    "Угроза обструкции верхних дыхательных путей (возможна трахеостомия)",
  intestinal_obstruction_suspected:
    "Подозрение на непроходимость/обтурацию (возможна стома/декомпрессия)",
  severe_dysphagia_or_unable_to_feed:
    "Выраженная дисфагия/невозможность питания (возможна гастростома)",
  tense_ascites: "Напряжённый асцит (возможен лапароцентез)",
  pleural_effusion_with_dyspnea:
    "Плевральный выпот с одышкой (возможен торакоцентез)",
  obstructive_jaundice_suspected: "Подозрение на механическую желтуху",
  dvt_suspected: "Подозрение на тромбоз вен нижней конечности",
  stoma_complication: "Осложнение стомы/дренажа",
  uncontrolled_cancer_pain:
    "Некуупируемая онкоболь / симптоматическая декомпенсация",
  other_known_cancer_emergency:
    "Иное неотложное состояние у пациента с известным ЗНО",
} as const;

const EMS_BY_GROUP = {
  novgorod: {
    id: "novgorod",
    name: "ГОБУЗ «Новгородская станция скорой медицинской помощи»",
    station: "Новгородская подстанция СМП",
    address: "г. Великий Новгород, ул. Обороны, д. 24",
  },
  staraya_russa: {
    id: "staraya_russa",
    name: "ГОБУЗ «Новгородская станция скорой медицинской помощи»",
    station: "Старорусская подстанция СМП",
    address: "Новгородская область, г. Старая Русса, ул. Некрасова, д. 27",
  },
  borovichi: {
    id: "borovichi",
    name: "ГОБУЗ «Новгородская станция скорой медицинской помощи»",
    station: "Боровичская подстанция СМП",
    address: "Новгородская область, г. Боровичи, ул. Дзержинского, д. 45",
  },
  valdai: {
    id: "valdai",
    name: "ФГБУ СЗОНКЦ им. Л.Г. Соколова ФМБА России",
    station: "Валдайский контур СМП",
    address: "Новгородская область, г. Валдай, ул. Песчаная, д. 16",
    notes: "По согласованию",
  },
  unknown: {
    id: "unknown",
    name: "Территория не распознана",
    station: "Нужна ручная проверка",
    address: "—",
    notes: "Проверьте муниципалитет вручную",
  },
} as const;

const PRIMARY_HOSPITAL_BY_GROUP = {
  novgorod: {
    name: "ГОБУЗ «Центральная городская клиническая больница» (опорный стационар территории)",
    address: "Великий Новгород, ул. Зелинского, д. 11",
  },
  staraya_russa: {
    name: "ГОБУЗ «Старорусская центральная районная больница» (опорный стационар территории)",
    address: "Старая Русса, ул. Александровская, д. 10",
  },
  borovichi: {
    name: "ГОБУЗ «Боровичская центральная районная больница» (опорный стационар территории)",
    address: "Боровичи, пл. 1 Мая, д. 2А",
  },
  valdai: {
    name: "Валдайский ММЦ ФГБУ СЗОНКЦ им. Л.Г. Соколова ФМБА России (опорный стационар территории)",
    address: "Валдай, ул. Песчаная, д. 1а (по согласованию)",
  },
  unknown: {
    name: "Не определён опорный стационар",
    address: "—",
    notes: "Нужна ручная проверка территории",
  },
} as const;

const ONCO_INFO_BY_TERRITORY: Record<string, string> = {
  "Великий Новгород": "ЦАОП ГОБУЗ «ЦГКБ» / при необходимости — ГОБУЗ «ОКОД»",
  Новгородский:
    "ПОК ГОБУЗ «Новгородская ЦРБ» (Трубичино) / при необходимости — ГОБУЗ «ОКОД»",
  Батецкий:
    "ПОК ГОБУЗ «Новгородская ЦРБ» (Трубичино) / при необходимости — ГОБУЗ «ОКОД»",
  Шимский: "ПОК ГОБУЗ «Шимская ЦРБ» / при необходимости — ГОБУЗ «ОКОД»",
  Солецкий: "ПОК ГОБУЗ «Солецкая ЦРБ» / при необходимости — ГОБУЗ «ОКОД»",
  Чудовский: "ПОК ГОБУЗ «Чудовская ЦРБ» / при необходимости — ГОБУЗ «ОКОД»",
  Маловишерский:
    "Новгородский контур (по скринам нужна ручная детализация конкретной точки входа)",
  Боровичи: "ЦАОП ГОБУЗ «Боровичская ЦРБ»",
  Боровичский: "ЦАОП ГОБУЗ «Боровичская ЦРБ»",
  Мошенской: "Боровичский контур: ЦАОП Боровичской ЦРБ / Мошенская больница",
  Любытинский: "Боровичский контур: ЦАОП Боровичской ЦРБ",
  Пестовский: "Боровичский контур: ЦАОП Боровичской ЦРБ / Пестовская ЦРБ",
  Хвойнинский: "Боровичский контур: ЦАОП Боровичской ЦРБ / Хвойнинская ЦРБ",
  Окуловский:
    "Окуловка: ПОК Окуловской ЦРБ + пересечения с Валдайским ММЦ (возможны варианты)",
  "Старая Русса": "ЦАОП ГОБУЗ «Старорусская ЦРБ»",
  Старорусский: "ЦАОП ГОБУЗ «Старорусская ЦРБ»",
  Волотовский: "Старорусский контур: ЦАОП Старорусской ЦРБ / Волотовский филиал",
  Парфинский: "Старорусский контур: ЦАОП Старорусской ЦРБ / Парфинский филиал",
  Поддорский: "Старорусский контур: ЦАОП Старорусской ЦРБ / Поддорская ЦРБ",
  Холмский: "Старорусский контур: ЦАОП Старорусской ЦРБ / Холмский филиал",
  Демянский: "Демянск: ПОК Демянской ЦРБ + пересечения с Валдайским ММЦ",
  Марёвский: "Марёво: ПОК Марёвской ЦРБ + пересечения с Валдайским ММЦ",
  Валдайский: "Валдайский ММЦ ФГБУ СЗОНКЦ им. Л.Г. Соколова ФМБА России",
  Крестецкий: "Крестцы: пересечения с Валдайским ММЦ (возможны варианты)",
};

const OVERLAP_TERRITORIES = [
  "Крестецкий",
  "Демянский",
  "Марёвский",
  "Окуловский",
  "Маловишерский",
] as const;
const SPECIAL_NURSING_TERRITORIES = [
  "Поддорский",
  "Холмский",
  "Марёвский",
] as const;

type TerritoryGroup = keyof typeof EMS_BY_GROUP;

function territoryGroup(territory: string): TerritoryGroup {
  for (const [group, territories] of Object.entries(
    ONCOLOGY_TERRITORY_GROUPS_V1,
  )) {
    if ((territories as readonly string[]).includes(territory)) {
      return group as Exclude<TerritoryGroup, "unknown">;
    }
  }
  return "unknown";
}

const TERRITORY_KEYS = [
  ...ONCOLOGY_TERRITORY_OPTIONS_V1,
  "__missing__",
  "__unknown__",
] as const;
const FORMAT_KEYS = ["__missing__", "outpatient", "inpatient", "nursing_care"] as const;

const EMS_BY_TERRITORY: Record<string, RoutingTemplateV1> = {};
const PRIMARY_BY_TERRITORY: Record<string, RoutingTemplateV1> = {};
const PRIMARY_NAMES: Record<string, RoutingTemplateV1> = {};
const PRIMARY_ADDRESSES: Record<string, RoutingTemplateV1> = {};
const ONCO_INFO: Record<string, RoutingTemplateV1> = {};

for (const territoryKey of TERRITORY_KEYS) {
  const group = territoryKey.startsWith("__")
    ? "unknown"
    : territoryGroup(territoryKey);
  const primary = PRIMARY_HOSPITAL_BY_GROUP[group];
  EMS_BY_TERRITORY[territoryKey] = EMS_BY_GROUP[group];
  PRIMARY_BY_TERRITORY[territoryKey] = primary;
  PRIMARY_NAMES[territoryKey] = primary.name;
  PRIMARY_ADDRESSES[territoryKey] = primary.address;
  ONCO_INFO[territoryKey] =
    territoryKey === "__missing__"
      ? "Не определено"
      : territoryKey === "__unknown__"
        ? "Нужна ручная проверка по таблице территориального закрепления"
        : ONCO_INFO_BY_TERRITORY[territoryKey] ??
          "Нужна ручная проверка по таблице территориального закрепления";
}

const PALLIATIVE_COMMON_UNCERTAINTIES = [
  "Точный выбор паллиативной МО в приказе часто привязан к направляющей медорганизации/филиалу. Без неё выбор может быть приблизительным.",
  "Если нужна точность: добавьте поле «направляющая МО/филиал» и выберите по таблице паллиативной сети.",
];
const NO_PALLIATIVE_DOCS =
  "Паллиативный профиль отмечен без документов: допустимо как рабочая гипотеза бригады, но точный паллиативный маршрут может потребовать подтверждения/оформления.";

function palliativeTarget(
  group: TerritoryGroup,
  territoryKey: string,
  formatKey: (typeof FORMAT_KEYS)[number],
) {
  if (formatKey === "__missing__") {
    return {
      title:
        "Подключить паллиативный контур; уточните формат (амбулаторно / стационар / сестринский уход)",
      uncertainties: PALLIATIVE_COMMON_UNCERTAINTIES,
    };
  }
  if (formatKey === "outpatient") {
    if (group === "borovichi") {
      return {
        title: "Амбулаторная паллиативная помощь: контур Боровичской ЦРБ",
        uncertainties: PALLIATIVE_COMMON_UNCERTAINTIES,
      };
    }
    if (group === "staraya_russa") {
      return {
        title: "Амбулаторная паллиативная помощь: контур Старорусской ЦРБ",
        uncertainties: PALLIATIVE_COMMON_UNCERTAINTIES,
      };
    }
    if (group === "novgorod") {
      return {
        title: "Амбулаторная паллиативная помощь: Новгородская ЦРБ / ЦГКБ / ОКОД",
        uncertainties: PALLIATIVE_COMMON_UNCERTAINTIES,
      };
    }
    if (group === "valdai") {
      return {
        title:
          "Амбулаторная паллиативная помощь: Валдайский контур (по согласованию/вариантам)",
        uncertainties: [
          ...PALLIATIVE_COMMON_UNCERTAINTIES,
          "По Валдайскому контуру возможны согласовательные маршруты.",
        ],
      };
    }
  }
  if (formatKey === "inpatient") {
    if (group === "novgorod") {
      return {
        title:
          "Стационарная паллиативная помощь: ОКОД / Пролетарский филиал НЦРБ / Батецкий филиал НЦРБ",
        uncertainties: PALLIATIVE_COMMON_UNCERTAINTIES,
      };
    }
    if (group === "borovichi") {
      return {
        title:
          "Стационарная паллиативная помощь: Окуловская ЦРБ / Боровичский контур",
        uncertainties: PALLIATIVE_COMMON_UNCERTAINTIES,
      };
    }
    if (group === "staraya_russa") {
      return {
        title:
          "Стационарная паллиативная помощь: Старорусский / Поддорский / Холмский контур",
        uncertainties: PALLIATIVE_COMMON_UNCERTAINTIES,
      };
    }
    if (group === "valdai") {
      return {
        title: "Стационарная паллиативная помощь: уточнить по таблице (варианты)",
        uncertainties: PALLIATIVE_COMMON_UNCERTAINTIES,
      };
    }
  }
  if (formatKey === "nursing_care") {
    return SPECIAL_NURSING_TERRITORIES.includes(
      territoryKey as (typeof SPECIAL_NURSING_TERRITORIES)[number],
    )
      ? {
          title:
            "Койки сестринского ухода: Поддорская ЦРБ / Холмский филиал / Марёвская ЦРБ",
          uncertainties: PALLIATIVE_COMMON_UNCERTAINTIES,
        }
      : {
          title:
            "Койки сестринского ухода: уточнить по таблице паллиативной сети",
          uncertainties: PALLIATIVE_COMMON_UNCERTAINTIES,
        };
  }
  return {
    title: "Паллиативный контур: нужен ручной выбор по таблице",
    uncertainties: PALLIATIVE_COMMON_UNCERTAINTIES,
  };
}

const PALLIATIVE_TARGETS: Record<string, RoutingTemplateV1> = {};
const PALLIATIVE_TRANSPORT: Record<string, RoutingTemplateV1> = {};
const PALLIATIVE_UNCERTAINTIES: Record<string, RoutingTemplateV1> = {};

for (const territoryKey of TERRITORY_KEYS) {
  const group = territoryKey.startsWith("__")
    ? "unknown"
    : territoryGroup(territoryKey);
  for (const formatKey of FORMAT_KEYS) {
    const palliative = palliativeTarget(group, territoryKey, formatKey);
    PALLIATIVE_TARGETS[`${territoryKey}|${formatKey}`] = palliative.title;
    for (const medicalTransportKey of ["false", "true"] as const) {
      PALLIATIVE_TRANSPORT[
        `${territoryKey}|${formatKey}|${medicalTransportKey}`
      ] =
        formatKey === "outpatient"
          ? "Экстренная госпитализация не основная цель; подключение паллиативной службы/выездной бригады"
          : medicalTransportKey === "true"
            ? `Медицинская транспортировка → ${PRIMARY_HOSPITAL_BY_GROUP[group].name} (уточнить паллиативную точку по таблице)`
            : "Формат определяется клинической ситуацией (амбулаторно/стационар/сестринский уход)";
    }
    for (const docsKey of ["false", "true"] as const) {
      PALLIATIVE_UNCERTAINTIES[`${territoryKey}|${formatKey}|${docsKey}`] = [
        ...palliative.uncertainties,
        ...(docsKey === "false" ? [NO_PALLIATIVE_DOCS] : []),
      ];
    }
  }
}

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

const COMMON_RESULT = {
  ems: catalog("emsByTerritory", { $field: "territoryKey" }),
  locationOncoInfo: catalog("oncoInfo", { $field: "territoryKey" }),
  locationPrimaryHospital: catalog(
    "primaryByTerritory",
    { $field: "territoryKey" },
  ),
} as const;

const HAS_SURGICAL: RoutingConditionV1 = {
  op: "any",
  conditions: ONCOLOGY_SURGICAL_SYNDROME_SIGNS_V1.map((value) => ({
    op: "includes" as const,
    field: "leadingSigns",
    value,
  })),
};
const HAS_GENERAL_EMERGENCY: RoutingConditionV1 = {
  op: "any",
  conditions: ONCOLOGY_GENERAL_EMERGENCY_SIGNS_V1.map((value) => ({
    op: "includes" as const,
    field: "leadingSigns",
    value,
  })),
};
const HAS_OVERLAP_TERRITORY: RoutingConditionV1 = {
  op: "in",
  field: "territory",
  values: OVERLAP_TERRITORIES,
};
const NO_OVERLAP_TERRITORY: RoutingConditionV1 = {
  op: "not",
  condition: HAS_OVERLAP_TERRITORY,
};

function all(...conditions: RoutingConditionV1[]): RoutingConditionV1 {
  return { op: "all", conditions };
}

function planResult(withOverlap: boolean): RoutingTemplateV1 {
  return {
    ...COMMON_RESULT,
    route: "plan_onco_referral",
    routeTitle: "Подозрение на ЗНО без признаков неотложности",
    target: {
      $concat: [
        "Передать в онкоконтур территории: ",
        catalog("oncoInfo", { $field: "territoryKey" }),
      ],
    },
    transport: "Экстренная транспортировка не показана",
    callouts: [
      "Есть только подозрение на ЗНО, но нет признаков экстренного/неотложного состояния.",
      "Бригада СМП не подменяет поликлинический диагностический контур.",
    ],
    ...(withOverlap
      ? {
          uncertainties: [
            "Для территории есть пересечение опорных точек; при сомнениях уточните, куда ближе/доступнее.",
          ],
        }
      : {}),
    sources: [
      "Порядок маршрутизации при подозрении на ЗНО: направление в ПОК/ЦАОП в течение 3 рабочих дней (плановый контур).",
      "Таблица территориального закрепления ЦАОП/ПОК.",
    ],
  };
}

function urgentSurgicalResult(
  knownCancer: boolean,
  withOverlap: boolean,
): RoutingTemplateV1 {
  return {
    ...COMMON_RESULT,
    route: knownCancer
      ? "urgent_oncosurgery_known_cancer"
      : "urgent_surgical_syndrome_unclear",
    routeTitle: knownCancer
      ? "Известное ЗНО + срочный хирургический/инвазивный синдром"
      : "Срочный хирургический/инвазивный синдром при подозрении/неясном онкостатусе",
    target: {
      $concat: [
        "Доставить в опорный стационар территории (хирургический профиль): ",
        catalog("primaryNames", { $field: "territoryKey" }),
      ],
    },
    transport: knownCancer
      ? {
          $concat: [
            "Транспортировка бригадой СМП → ",
            catalog("primaryNames", { $field: "territoryKey" }),
            " (",
            catalog("primaryAddresses", { $field: "territoryKey" }),
            ")",
          ],
        }
      : {
          $concat: [
            "Транспортировка бригадой СМП → ",
            catalog("primaryAddresses", { $field: "territoryKey" }),
          ],
        },
    callouts: knownCancer
      ? [
          "СМП фиксирует синдром (обструкция/непроходимость/асцит/выпот/желтуха/ТГВ/кровотечение и т.д.), а конкретное вмешательство решает принимающее ЛПУ.",
          "После стабилизации возможна дальнейшая маршрутизация в онкоконтур территории.",
        ]
      : [
          "Синдром требует стационарного решения независимо от того, подтверждён ли диагноз ЗНО.",
          "Приоритет — устранить непосредственную угрозу и выполнить ЛПУ-уровень уточнения диагноза/тактики.",
        ],
    ...(withOverlap
      ? {
          uncertainties: [
            "Для территории возможны варианты опорных точек; при сомнениях уточните ближайшую/дежурную хирургическую площадку.",
          ],
        }
      : {}),
    sources: knownCancer
      ? [
          "Перечень неотложных состояний у пациента с установленным ЗНО: эвакуация в стационар с хирургическими отделениями.",
          "Территориальная сеть опорных медорганизаций (ЦАОП/ЦРБ/ММЦ).",
        ]
      : [
          "Раздел о неотложных состояниях: доставка в стационар, оказывающий специализированную помощь в хирургических отделениях.",
        ],
  };
}

function urgentGeneralResult(withOverlap: boolean): RoutingTemplateV1 {
  return {
    ...COMMON_RESULT,
    route: "urgent_general_hospital",
    routeTitle: "Общая неотложная госпитализация",
    target: {
      $concat: [
        "Доставить в опорный стационар территории: ",
        catalog("primaryNames", { $field: "territoryKey" }),
      ],
    },
    transport: {
      $concat: [
        "Транспортировка бригадой СМП → ",
        catalog("primaryAddresses", { $field: "territoryKey" }),
      ],
    },
    callouts: [
      "Есть признаки неотложного состояния: сознание/дыхание/кровообращение/кровотечение/острая боль.",
      "В MVP точка доставки фиксируется как опорный стационар территории; внутри стационара профиль определяется по клинической картине.",
    ],
    ...(withOverlap
      ? {
          uncertainties: [
            "Для территории возможны варианты опорных точек; при сомнениях уточните ближайший дежурный стационар.",
          ],
        }
      : {}),
    sources: [
      "Пункты приказа о поводах для вызова СМП и об оказании помощи при неотложных состояниях.",
      "Территориальное закрепление СМП.",
    ],
  };
}

function medicalTransportResult(withOverlap: boolean): RoutingTemplateV1 {
  return {
    ...COMMON_RESULT,
    route: "medical_transport_non_emergency",
    routeTitle:
      "Медицинская транспортировка без признаков критической неотложности",
    target: {
      $concat: [
        "Точка доставки по текущему местоположению: ",
        catalog("primaryNames", { $field: "territoryKey" }),
      ],
    },
    transport: {
      $concat: [
        "Медицинская транспортировка бригадой СМП → ",
        catalog("primaryNames", { $field: "territoryKey" }),
        " (",
        catalog("primaryAddresses", { $field: "territoryKey" }),
        ")",
      ],
    },
    callouts: [
      "Пациент стабилен, но сам не доедет или требуется доставка в ЛПУ для решения вопроса.",
      "В MVP точка доставки фиксируется как опорный стационар территории; далее — решение внутри ЛПУ.",
    ],
    ...(withOverlap
      ? {
          uncertainties: [
            "Для территории возможны варианты опорных точек; при сомнениях уточните ближайший дежурный стационар.",
          ],
        }
      : {}),
    sources: [
      "Организационная логика СМП: перевозка пациента туда, где вопрос должен быть решён.",
    ],
  };
}

function noHospitalizationResult(withOverlap: boolean): RoutingTemplateV1 {
  return {
    ...COMMON_RESULT,
    route: "no_hospitalization",
    routeTitle: "Без госпитализации",
    target: {
      $concat: [
        "Оставление на месте / рекомендации. Для онко-контура территории: ",
        catalog("oncoInfo", { $field: "territoryKey" }),
      ],
    },
    transport: "Госпитализация и медтранспорт не требуются по текущей оценке",
    callouts: [
      "Нет признаков экстренного/неотложного состояния.",
      "Нет синдрома, требующего хирургического/инвазивного стационара.",
      "Нет отдельной цели медицинской транспортировки.",
    ],
    ...(withOverlap
      ? {
          uncertainties: [
            "Для территории есть пересечение опорных точек; при необходимости уточните ближайшую/доступную точку онко-контура.",
          ],
        }
      : {}),
    sources: ["Логическое завершение контакта СМП."],
  };
}

const PALLIATIVE_RESULT: RoutingTemplateV1 = {
  ...COMMON_RESULT,
  route: "palliative",
  routeTitle: "Паллиативный маршрут",
  target: catalog(
    "palliativeTargets",
    joinedKey("territoryKey", "palliativeFormatKey"),
  ),
  transport: catalog(
    "palliativeTransport",
    joinedKey(
      "territoryKey",
      "palliativeFormatKey",
      "medicalTransportNeededKey",
    ),
  ),
  callouts: [
    "Паллиативная ветка вторична по отношению к сосудистой/кардиальной и экстренной хирургической/общей неотложной веткам.",
    "Если есть некупируемая онкоболь без иной угрозы жизни — предпочтителен паллиативный/симптоматический контур.",
  ],
  uncertainties: catalog(
    "palliativeUncertainties",
    joinedKey("territoryKey", "palliativeFormatKey", "docsAvailableKey"),
  ),
  sources: [
    "Приложения о паллиативной помощи и территориальном закреплении паллиативной сети.",
  ],
};

export const ONCOLOGY_RULE_SET_V1 = {
  schemaVersion: 1,
  id: "oncology.v1",
  profileId: "oncology",
  catalogs: {
    emsByTerritory: EMS_BY_TERRITORY,
    primaryByTerritory: PRIMARY_BY_TERRITORY,
    primaryNames: PRIMARY_NAMES,
    primaryAddresses: PRIMARY_ADDRESSES,
    oncoInfo: ONCO_INFO,
    palliativeTargets: PALLIATIVE_TARGETS,
    palliativeTransport: PALLIATIVE_TRANSPORT,
    palliativeUncertainties: PALLIATIVE_UNCERTAINTIES,
  },
  rules: [
    {
      id: "vascular_cardiac",
      priority: 10,
      when: {
        op: "includes",
        field: "leadingSigns",
        value: "mi_or_stroke_suspected",
      },
      result: {
        ...COMMON_RESULT,
        route: "vascular_cardiac",
        routeTitle:
          "Подозрение на инфаркт / ОНМК (приоритет сосудистого/кардиологического профиля)",
        target: {
          $concat: [
            "Доставить в опорный стационар территории: ",
            catalog("primaryNames", { $field: "territoryKey" }),
            ". Далее — по сосудистому/кардиологическому маршруту.",
          ],
        },
        transport: {
          $concat: [
            "Экстренная транспортировка бригадой СМП → ",
            catalog("primaryNames", { $field: "territoryKey" }),
            " (",
            catalog("primaryAddresses", { $field: "territoryKey" }),
            ")",
          ],
        },
        callouts: [
          "Онкологический статус не отменяет профильный сосудистый/кардиологический маршрут.",
          "В данном MVP точная больница ПСО/РСЦ не зашита отдельной матрицей; базовая точка доставки — опорный стационар территории.",
        ],
        uncertainties: [
          "Для 100% точности нужна отдельная региональная матрица маршрутизации ОНМК/ОКС (РСЦ/ПСО/кардио).",
        ],
        sources: [
          "Раздел приказа о неотложных состояниях: при инфаркте/ОНМК эвакуация в профильные сосудистые/кардиологические стационары.",
          "Территориальное закрепление СМП.",
        ],
      },
    },
    {
      id: "urgent_oncosurgery_known_overlap",
      priority: 20,
      when: all(
        HAS_SURGICAL,
        { op: "eq", field: "oncologyStatus", value: "confirmed_known" },
        HAS_OVERLAP_TERRITORY,
      ),
      result: urgentSurgicalResult(true, true),
    },
    {
      id: "urgent_oncosurgery_known",
      priority: 21,
      when: all(
        HAS_SURGICAL,
        { op: "eq", field: "oncologyStatus", value: "confirmed_known" },
        NO_OVERLAP_TERRITORY,
      ),
      result: urgentSurgicalResult(true, false),
    },
    {
      id: "urgent_surgical_unclear_overlap",
      priority: 30,
      when: all(HAS_SURGICAL, HAS_OVERLAP_TERRITORY),
      result: urgentSurgicalResult(false, true),
    },
    {
      id: "urgent_surgical_unclear",
      priority: 31,
      when: all(HAS_SURGICAL, NO_OVERLAP_TERRITORY),
      result: urgentSurgicalResult(false, false),
    },
    {
      id: "urgent_general_overlap",
      priority: 40,
      when: all(
        {
          op: "any",
          conditions: [
            HAS_GENERAL_EMERGENCY,
            all(
              {
                op: "includes",
                field: "leadingSigns",
                value: "other_known_cancer_emergency",
              },
              { op: "eq", field: "oncologyStatus", value: "confirmed_known" },
            ),
          ],
        },
        HAS_OVERLAP_TERRITORY,
      ),
      result: urgentGeneralResult(true),
    },
    {
      id: "urgent_general",
      priority: 41,
      when: all(
        {
          op: "any",
          conditions: [
            HAS_GENERAL_EMERGENCY,
            all(
              {
                op: "includes",
                field: "leadingSigns",
                value: "other_known_cancer_emergency",
              },
              { op: "eq", field: "oncologyStatus", value: "confirmed_known" },
            ),
          ],
        },
        NO_OVERLAP_TERRITORY,
      ),
      result: urgentGeneralResult(false),
    },
    {
      id: "palliative_with_trigger",
      priority: 50,
      when: all(
        { op: "eq", field: "palliativeProfileKnown", value: true },
        {
          op: "any",
          conditions: [
            {
              op: "includes",
              field: "leadingSigns",
              value: "uncontrolled_cancer_pain",
            },
            { op: "eq", field: "medicalTransportNeeded", value: true },
            { op: "present", field: "palliativeFormat" },
          ],
        },
      ),
      result: PALLIATIVE_RESULT,
    },
    {
      id: "plan_onco_referral_overlap",
      priority: 60,
      when: all(
        { op: "eq", field: "oncologyStatus", value: "suspected_only" },
        { op: "neq", field: "medicalTransportNeeded", value: true },
        HAS_OVERLAP_TERRITORY,
      ),
      result: planResult(true),
    },
    {
      id: "plan_onco_referral",
      priority: 61,
      when: all(
        { op: "eq", field: "oncologyStatus", value: "suspected_only" },
        { op: "neq", field: "medicalTransportNeeded", value: true },
        NO_OVERLAP_TERRITORY,
      ),
      result: planResult(false),
    },
    {
      id: "medical_transport_overlap",
      priority: 70,
      when: all(
        { op: "eq", field: "medicalTransportNeeded", value: true },
        HAS_OVERLAP_TERRITORY,
      ),
      result: medicalTransportResult(true),
    },
    {
      id: "medical_transport",
      priority: 71,
      when: all(
        { op: "eq", field: "medicalTransportNeeded", value: true },
        NO_OVERLAP_TERRITORY,
      ),
      result: medicalTransportResult(false),
    },
    {
      id: "palliative_without_trigger",
      priority: 80,
      when: { op: "eq", field: "palliativeProfileKnown", value: true },
      result: PALLIATIVE_RESULT,
    },
    {
      id: "no_hospitalization_overlap",
      priority: 90,
      when: all(
        { op: "eq", field: "always", value: true },
        HAS_OVERLAP_TERRITORY,
      ),
      result: noHospitalizationResult(true),
    },
    {
      id: "no_hospitalization",
      priority: 91,
      when: { op: "eq", field: "always", value: true },
      result: noHospitalizationResult(false),
    },
  ],
} as const satisfies RoutingRuleSetV1;
