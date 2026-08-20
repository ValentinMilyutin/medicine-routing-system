import type {
  RoutingConditionV1,
  RoutingRuleSetV1,
  RoutingTemplateV1,
} from "./rules-v1.js";

export const OBSTETRICS_LPU_V1 = {
  NOKB: {
    id: "nokb",
    name: "ГОБУЗ «Новгородская областная клиническая больница» (НОКБ)",
  },
  NOKPC: {
    id: "nokpc",
    name: "ГОБУЗ «НОКПЦ имени В.Ю. Мишекурина» (НОКПЦ)",
    notes: "АРКЦ/перинатальный центр",
  },
  NOIB: {
    id: "noib",
    name: "ГОБУЗ «Новгородская областная инфекционная больница»",
  },
  CGKB: {
    id: "cgkb",
    name: "ГОБУЗ «Центральная городская клиническая больница» (ЦГКБ)",
  },
  BOR: { id: "bor", name: "ГОБУЗ «Боровичская ЦРБ» (Боровичи)" },
  PESTO: { id: "pesto", name: "ГОБУЗ «Пестовская ЦРБ» (Пестово)" },
  STAR: { id: "star", name: "ГОБУЗ «Старорусская ЦРБ» (Старая Русса)" },
  VALDAI: {
    id: "valdai",
    name: "Валдайский ММЦ ФГБУ «СЗОНКЦ им. Л.Г. Соколова» ФМБА России",
    notes: "по согласованию",
  },
} as const;

export const OBSTETRICS_TERRITORIES_BOROVICHI_V1 = [
  "Боровичи",
  "Боровичский район",
  "Любытинский",
  "Хвойнинский",
  "Пестовский",
  "Мошенской",
  "Окуловский",
] as const;
export const OBSTETRICS_TERRITORIES_STARAYA_RUSSA_V1 = [
  "Старая Русса",
  "Старорусский",
  "Парфинский",
  "Поддорский",
  "Холмский",
  "Волотовский",
] as const;
export const OBSTETRICS_TERRITORIES_VALDAI_V1 = [
  "Валдайский",
  "Крестецкий",
  "Демянский",
  "Марёвский",
] as const;
export const OBSTETRICS_TERRITORIES_NOVGOROD_V1 = [
  "Великий Новгород",
  "Новгородский район",
  "Батецкий",
  "Шимский",
  "Маловишерский",
  "Чудовский",
  "Солецкий",
] as const;

const GYN_CGKB = [
  "Великий Новгород",
  "Батецкий",
  "Новгородский район",
  "Чудовский",
  "Маловишерский",
  "Мошенской",
  "Мошенской район",
] as const;
const GYN_BOR = [
  "Боровичи",
  "Боровичский район",
  "Любытинский",
  "Хвойнинский",
  "Окуловский",
] as const;
const GYN_STAR = [
  "Старая Русса",
  "Старорусский",
  "Парфинский",
  "Поддорский",
  "Холмский",
  "Волотовский",
  "Солецкий",
  "Шимский",
] as const;

const TERRITORY_VALUES = [
  ...new Set([
    ...OBSTETRICS_TERRITORIES_BOROVICHI_V1,
    ...OBSTETRICS_TERRITORIES_STARAYA_RUSSA_V1,
    ...OBSTETRICS_TERRITORIES_VALDAI_V1,
    ...OBSTETRICS_TERRITORIES_NOVGOROD_V1,
    "Мошенской район",
    "Пестово",
  ]),
] as const;
const TERRITORY_KEYS = [...TERRITORY_VALUES, "__missing__", "__unknown__"];

type TerritoryGroup =
  | "borovichi"
  | "staraya_russa"
  | "valdai"
  | "novgorod"
  | "unknown";

function territoryGroup(territory: string): TerritoryGroup {
  if (
    (OBSTETRICS_TERRITORIES_BOROVICHI_V1 as readonly string[]).includes(
      territory,
    )
  ) {
    return "borovichi";
  }
  if (
    (OBSTETRICS_TERRITORIES_STARAYA_RUSSA_V1 as readonly string[]).includes(
      territory,
    )
  ) {
    return "staraya_russa";
  }
  if (
    (OBSTETRICS_TERRITORIES_VALDAI_V1 as readonly string[]).includes(territory)
  ) {
    return "valdai";
  }
  if (
    (OBSTETRICS_TERRITORIES_NOVGOROD_V1 as readonly string[]).includes(
      territory,
    )
  ) {
    return "novgorod";
  }
  return "unknown";
}

const NEAREST_TARGETS: Record<string, RoutingTemplateV1> = {};
const TRAUMA_ICU_TARGETS: Record<string, RoutingTemplateV1> = {};
const GYN_TARGETS: Record<string, RoutingTemplateV1> = {};
const INFECTION_MILD_TARGETS: Record<string, RoutingTemplateV1> = {};
const SURGERY_TARGETS: Record<string, RoutingTemplateV1> = {};
const OBSTETRICS_LOW_RISK_TARGETS: Record<string, RoutingTemplateV1> = {};
const POSTPARTUM_OTHER_TARGETS: Record<string, RoutingTemplateV1> = {};

for (const territoryKey of TERRITORY_KEYS) {
  const group = territoryKey.startsWith("__")
    ? "unknown"
    : territoryGroup(territoryKey);
  const nearest =
    group === "borovichi"
      ? OBSTETRICS_LPU_V1.BOR
      : group === "staraya_russa"
        ? OBSTETRICS_LPU_V1.STAR
        : group === "valdai"
          ? OBSTETRICS_LPU_V1.VALDAI
          : OBSTETRICS_LPU_V1.CGKB;
  NEAREST_TARGETS[territoryKey] = nearest;
  TRAUMA_ICU_TARGETS[territoryKey] =
    territoryKey === "Пестовский" || territoryKey === "Пестово"
      ? OBSTETRICS_LPU_V1.PESTO
      : nearest;
  GYN_TARGETS[territoryKey] = (
    GYN_CGKB as readonly string[]
  ).includes(territoryKey)
    ? OBSTETRICS_LPU_V1.CGKB
    : (OBSTETRICS_TERRITORIES_VALDAI_V1 as readonly string[]).includes(
          territoryKey,
        )
      ? OBSTETRICS_LPU_V1.VALDAI
      : (GYN_BOR as readonly string[]).includes(territoryKey)
        ? OBSTETRICS_LPU_V1.BOR
        : territoryKey === "Пестовский"
          ? OBSTETRICS_LPU_V1.PESTO
          : (GYN_STAR as readonly string[]).includes(territoryKey)
            ? OBSTETRICS_LPU_V1.STAR
            : OBSTETRICS_LPU_V1.CGKB;
  INFECTION_MILD_TARGETS[territoryKey] =
    group === "borovichi"
      ? OBSTETRICS_LPU_V1.BOR
      : group === "staraya_russa"
        ? OBSTETRICS_LPU_V1.STAR
        : OBSTETRICS_LPU_V1.CGKB;
  SURGERY_TARGETS[territoryKey] = nearest;
  OBSTETRICS_LOW_RISK_TARGETS[territoryKey] =
    group === "borovichi"
      ? OBSTETRICS_LPU_V1.BOR
      : group === "valdai"
        ? OBSTETRICS_LPU_V1.VALDAI
        : group === "staraya_russa"
          ? OBSTETRICS_LPU_V1.STAR
          : OBSTETRICS_LPU_V1.NOKPC;
  POSTPARTUM_OTHER_TARGETS[territoryKey] =
    group === "borovichi"
      ? OBSTETRICS_LPU_V1.BOR
      : group === "valdai"
        ? OBSTETRICS_LPU_V1.VALDAI
        : OBSTETRICS_LPU_V1.NOKPC;
}

const CRITICAL_KIND_CALLOUTS = {
  __missing__: "Критическое состояние: да",
  bleeding: "Критическое состояние: кровотечение",
  preeclampsia_eclampsia:
    "Критическое состояние: преэклампсия/эклампсия/судороги",
  sepsis_shock: "Критическое состояние: сепсис/шок",
  resp_failure: "Критическое состояние: дыхательная недостаточность",
  teo_cardiac:
    "Критическое состояние: ТЭО/острая кардиальная декомпенсация",
  other: "Критическое состояние: прочее критическое",
} as const;
const POSTPARTUM_LABELS = {
  bleeding: "кровотечение",
  sepsis_fever: "лихорадка/подозрение на сепсис",
  seizures_hypertensive: "судороги/гипертензивные осложнения",
  resp_failure: "дыхательная недостаточность",
  teo_cardiac: "тромбоэмболические/кардиальные осложнения",
  postop_pain_other: "прочее/послеоперационное/боль",
} as const;
const RISK_LABELS = {
  mid: "средний",
  high: "высокий",
} as const;

const catalog = (catalogId: string, key: RoutingTemplateV1) => ({
  $catalog: catalogId,
  key,
}) as const;
const territoryTarget = (catalogId: string) =>
  catalog(catalogId, { $field: "territoryKey" });
const TRUE = (field: string): RoutingConditionV1 => ({
  op: "eq",
  field,
  value: true,
});
const FALSE = (field: string): RoutingConditionV1 => ({
  op: "neq",
  field,
  value: true,
});
const all = (...conditions: RoutingConditionV1[]): RoutingConditionV1 => ({
  op: "all",
  conditions,
});
const SCENARIO = (value: string): RoutingConditionV1 => ({
  op: "eq",
  field: "scenario",
  value,
});
const HAS_TERRITORY: RoutingConditionV1 = {
  op: "present",
  field: "territory",
};
const VALDAI_TERRITORY: RoutingConditionV1 = {
  op: "in",
  field: "territory",
  values: OBSTETRICS_TERRITORIES_VALDAI_V1,
};
const NOT_VALDAI_TERRITORY: RoutingConditionV1 = {
  op: "not",
  condition: VALDAI_TERRITORY,
};

function criticalResult(profileNokb: boolean): RoutingTemplateV1 {
  return {
    target: catalog("lpu", profileNokb ? "NOKB" : "NOKPC"),
    transport: profileNokb
      ? "СМП (экстренно) в профильный стационар"
      : "СМП (экстренно) + уведомление/вызов АРКЦ НОКПЦ (выездная анестезиолого-реанимационная акушерская бригада при необходимости)",
    callouts: [
      catalog("criticalKindCallouts", { $field: "criticalKindKey" }),
      profileNokb
        ? "Маршрут: профильная/общесоматическая критика → НОКБ"
        : "Маршрут: Критическое акшерское состояние (КАС) → НОКПЦ (АРКЦ)",
    ],
    sources: [
      profileNokb
        ? "Схема: профильная/общесоматическая критика → НОКБ"
        : "Прил. 5: неотложные состояния (АРКЦ НОКПЦ)",
    ],
  };
}

function territorialResult(
  targetCatalog: string,
  callouts: RoutingTemplateV1[],
  sources: string[],
  valdai: boolean,
  alternativeNokpc = false,
  emergency = false,
): RoutingTemplateV1 {
  return {
    target: territoryTarget(targetCatalog),
    ...(valdai && alternativeNokpc
      ? { alternative: catalog("lpu", "NOKPC") }
      : {}),
    transport: valdai
      ? emergency
        ? "СМП (экстренно, по согласованию)"
        : "СМП (по согласованию)"
      : emergency
        ? "СМП (экстренно)"
        : "СМП",
    callouts,
    sources,
  };
}

const POSTPARTUM_CRITICAL_ISSUES = [
  "bleeding",
  "sepsis_fever",
  "seizures_hypertensive",
  "resp_failure",
  "teo_cardiac",
] as const;

export const OBSTETRICS_RULE_SET_V1 = {
  schemaVersion: 1,
  id: "obstetrics.v1",
  profileId: "obgyn",
  catalogs: {
    lpu: OBSTETRICS_LPU_V1,
    nearestTargets: NEAREST_TARGETS,
    traumaIcuTargets: TRAUMA_ICU_TARGETS,
    gynTargets: GYN_TARGETS,
    infectionMildTargets: INFECTION_MILD_TARGETS,
    surgeryTargets: SURGERY_TARGETS,
    obstetricsLowRiskTargets: OBSTETRICS_LOW_RISK_TARGETS,
    postpartumOtherTargets: POSTPARTUM_OTHER_TARGETS,
    criticalKindCallouts: CRITICAL_KIND_CALLOUTS,
    postpartumLabels: POSTPARTUM_LABELS,
    riskLabels: RISK_LABELS,
    standardTerritoryTransport: {
      borovichi: "СМП",
      staraya_russa: "СМП",
      valdai: "СМП (по согласованию)",
      novgorod: "СМП",
      unknown: "СМП",
    },
    traumaSevereTransport: {
      borovichi: "СМП (экстренно)",
      staraya_russa: "СМП (экстренно)",
      valdai: "СМП (экстренно, по согласованию)",
      novgorod: "СМП (экстренно)",
      unknown: "СМП (экстренно)",
    },
  },
  rules: [
    {
      id: "infection_flu_covid",
      priority: 10,
      when: { op: "eq", field: "infectionType", value: "flu_covid" },
      result: {
        target: catalog("lpu", "NOIB"),
        transport: "СМП",
        callouts: ["Инфекция: грипп/COVID"],
        sources: [
          "Схема: «Грипп и COVID → Новгородская областная инфекционная больница»",
        ],
      },
    },
    {
      id: "infection_arvi_severe_over_7_days",
      priority: 20,
      when: all(
        { op: "eq", field: "infectionType", value: "arvi_pneumo" },
        TRUE("infectionSevere"),
        TRUE("infectionOver7Days"),
      ),
      result: {
        target: catalog("lpu", "NOKPC"),
        transport: "СМП (с учётом тяжести), при необходимости согласование",
        callouts: [
          "Инфекция: ОРВИ/пневмония",
          "Тяжёлое состояние",
          "Опция по схеме: >7 дней → НОКПЦ",
        ],
        sources: [
          "Схема: «Беременные с пневмонией/ОРВИ» (тяжёлые состояния)",
        ],
      },
    },
    {
      id: "infection_arvi_severe",
      priority: 21,
      when: all(
        { op: "eq", field: "infectionType", value: "arvi_pneumo" },
        TRUE("infectionSevere"),
        FALSE("infectionOver7Days"),
      ),
      result: {
        target: catalog("lpu", "NOKB"),
        transport: "СМП (с учётом тяжести), при необходимости согласование",
        callouts: [
          "Инфекция: ОРВИ/пневмония",
          "Тяжёлое состояние",
          "Маршрут на НОКБ",
        ],
        sources: [
          "Схема: «Беременные с пневмонией/ОРВИ» (тяжёлые состояния)",
        ],
      },
    },
    {
      id: "infection_arvi_mild",
      priority: 22,
      when: all(
        { op: "eq", field: "infectionType", value: "arvi_pneumo" },
        FALSE("infectionSevere"),
      ),
      result: {
        target: territoryTarget("infectionMildTargets"),
        transport: "СМП",
        callouts: [
          "Инфекция: ОРВИ/пневмония",
          "Лёгкое/среднее течение → по территории",
        ],
        sources: [
          "Схема: «Пневмония и ОРВИ» (по территориям → Боровичи/Старая Русса/ЦГКБ)",
        ],
      },
    },
    {
      id: "trauma_severe",
      priority: 30,
      when: all(TRUE("trauma"), TRUE("traumaSevere")),
      result: {
        target: territoryTarget("traumaIcuTargets"),
        alternative: catalog("lpu", "NOKB"),
        transport: catalog("traumaSevereTransport", {
          $field: "territoryGroupKey",
        }),
        callouts: [
          "ДТП/травма",
          "Требуется реанимация → ближайшее ЛПУ с ОАРИТ (ВН/Боровичи/Пестово/Старая Русса/Валдай)",
          "При необходимости — дальнейшая эвакуация/перевод в НОКБ",
        ],
        sources: [
          "Уточнение: при травме и необходимости реанимации — ближайшее ЛПУ с ОАРИТ (ВН/Боровичи/Пестово/Старая Русса/Валдай)",
        ],
      },
    },
    {
      id: "trauma_nonsevere",
      priority: 31,
      when: all(TRUE("trauma"), FALSE("traumaSevere")),
      result: {
        target: territoryTarget("nearestTargets"),
        alternative: catalog("lpu", "NOKB"),
        transport: catalog("standardTerritoryTransport", {
          $field: "territoryGroupKey",
        }),
        callouts: [
          "ДТП/травма",
          "Без признаков тяжести → ближайшая больница по территории",
          "При ухудшении/политравме — перевод в НОКБ",
        ],
        sources: [
          "MVP: ДТП/травма (нетяжёлая) → ближайшая больница по территории",
        ],
      },
    },
    {
      id: "surgery_life_gyne_city",
      priority: 40,
      when: all(
        TRUE("surgery"),
        TRUE("surgeryLifeThreat"),
        SCENARIO("gyne_lt37"),
        { op: "eq", field: "surgeryProfile", value: "city" },
      ),
      result: {
        target: catalog("lpu", "CGKB"),
        transport: "СМП (экстренно)",
        callouts: [
          "Экстрагенитальная хирургия: угроза жизни",
          "Гинекология (<37) → выбор профиля (ЦГКБ/НОКБ)",
        ],
        sources: [
          "Конспект: <37 недель при угрозе жизни → ЦГКБ или НОКБ (по профилю)",
        ],
      },
    },
    {
      id: "surgery_life_gyne_regional",
      priority: 41,
      when: all(
        TRUE("surgery"),
        TRUE("surgeryLifeThreat"),
        SCENARIO("gyne_lt37"),
        { op: "neq", field: "surgeryProfile", value: "city" },
      ),
      result: {
        target: catalog("lpu", "NOKB"),
        transport: "СМП (экстренно)",
        callouts: [
          "Экстрагенитальная хирургия: угроза жизни",
          "Гинекология (<37) → выбор профиля (ЦГКБ/НОКБ)",
        ],
        sources: [
          "Конспект: <37 недель при угрозе жизни → ЦГКБ или НОКБ (по профилю)",
        ],
      },
    },
    {
      id: "surgery_life_obstetric_postpartum",
      priority: 42,
      when: all(
        TRUE("surgery"),
        TRUE("surgeryLifeThreat"),
        {
          op: "in",
          field: "scenario",
          values: ["obstetrics_ge37", "postpartum_le42"],
        },
      ),
      result: {
        target: catalog("lpu", "NOKB"),
        transport: "СМП (экстренно)",
        callouts: [
          "Экстрагенитальная хирургия: угроза жизни",
          "Акушерство / послеродовый период → НОКБ",
        ],
        sources: ["Конспект: при угрозе жизни → НОКБ"],
      },
    },
    {
      id: "surgery_nonlife_valdai",
      priority: 43,
      when: all(
        TRUE("surgery"),
        FALSE("surgeryLifeThreat"),
        VALDAI_TERRITORY,
      ),
      result: territorialResult(
        "surgeryTargets",
        ["Экстрагенитальная хирургия без явной угрозы жизни → по территории"],
        [
          "Схема: «в ЦРБ/ММЦ только при отсутствии угрозы жизни; при угрозе → ЦГКБ/НОКБ»",
        ],
        true,
        true,
      ),
    },
    {
      id: "surgery_nonlife",
      priority: 44,
      when: all(
        TRUE("surgery"),
        FALSE("surgeryLifeThreat"),
        NOT_VALDAI_TERRITORY,
      ),
      result: territorialResult(
        "surgeryTargets",
        ["Экстрагенитальная хирургия без явной угрозы жизни → по территории"],
        [
          "Схема: «в ЦРБ/ММЦ только при отсутствии угрозы жизни; при угрозе → ЦГКБ/НОКБ»",
        ],
        false,
      ),
    },
    {
      id: "extragenital",
      priority: 50,
      when: TRUE("extragenitalInpatient"),
      result: {
        target: catalog("lpu", "NOKB"),
        transport: "СМП (по согласованию/профилю)",
        callouts: [
          "Тяжёлая экстрагенитальная патология / требуется профильный стационар",
          "Маршрут на НОКБ",
        ],
        sources: ["Экстрагенитальная (не хирургия) → НОКБ"],
      },
    },
    {
      id: "postpartum_critical_profile",
      priority: 60,
      when: all(
        SCENARIO("postpartum_le42"),
        TRUE("critical"),
        { op: "eq", field: "criticalRoute", value: "profile_nokb" },
      ),
      result: criticalResult(true),
    },
    {
      id: "postpartum_critical_kas",
      priority: 61,
      when: all(
        SCENARIO("postpartum_le42"),
        TRUE("critical"),
        { op: "neq", field: "criticalRoute", value: "profile_nokb" },
      ),
      result: criticalResult(false),
    },
    {
      id: "postpartum_issue_critical",
      priority: 62,
      when: all(
        SCENARIO("postpartum_le42"),
        {
          op: "in",
          field: "postpartumIssue",
          values: POSTPARTUM_CRITICAL_ISSUES,
        },
      ),
      result: {
        target: catalog("lpu", "NOKPC"),
        transport:
          "СМП (экстренно) + уведомление/вызов АРКЦ НОКПЦ при необходимости",
        callouts: [
          {
            $concat: [
              "Послеродовый ≤42 дней: ",
              catalog("postpartumLabels", { $field: "postpartumIssue" }),
              " → критическая маршрутизация (Маршрут: Критическое акyшерское состояние (КАС))",
            ],
          },
        ],
        sources: [
          "Прил. 5: неотложные состояния в послеродовом периоде (АРКЦ НОКПЦ)",
        ],
      },
    },
    {
      id: "postpartum_other_valdai",
      priority: 63,
      when: all(
        SCENARIO("postpartum_le42"),
        { op: "eq", field: "postpartumIssue", value: "postop_pain_other" },
        VALDAI_TERRITORY,
      ),
      result: territorialResult(
        "postpartumOtherTargets",
        ["Послеродовый ≤42 дней: прочее осложнение → по территории"],
        [
          "Упрощение: послеродовое прочее → как акушерский стационар по территории",
        ],
        true,
        true,
      ),
    },
    {
      id: "postpartum_other",
      priority: 64,
      when: all(
        SCENARIO("postpartum_le42"),
        { op: "eq", field: "postpartumIssue", value: "postop_pain_other" },
        NOT_VALDAI_TERRITORY,
      ),
      result: territorialResult(
        "postpartumOtherTargets",
        ["Послеродовый ≤42 дней: прочее осложнение → по территории"],
        [
          "Упрощение: послеродовое прочее → как акушерский стационар по территории",
        ],
        false,
      ),
    },
    {
      id: "gyne_critical_valdai",
      priority: 70,
      when: all(
        SCENARIO("gyne_lt37"),
        HAS_TERRITORY,
        TRUE("critical"),
        VALDAI_TERRITORY,
      ),
      result: territorialResult(
        "gynTargets",
        [
          "Профиль: гинекология (<37 недель)",
          "Критическое/срочное состояние → экстренная госпитализация по территории",
        ],
        ["Приказ 792-Д: столбец «Экстренная госпитализация»"],
        true,
        false,
        true,
      ),
    },
    {
      id: "gyne_critical",
      priority: 71,
      when: all(
        SCENARIO("gyne_lt37"),
        HAS_TERRITORY,
        TRUE("critical"),
        NOT_VALDAI_TERRITORY,
      ),
      result: territorialResult(
        "gynTargets",
        [
          "Профиль: гинекология (<37 недель)",
          "Критическое/срочное состояние → экстренная госпитализация по территории",
        ],
        ["Приказ 792-Д: столбец «Экстренная госпитализация»"],
        false,
        false,
        true,
      ),
    },
    {
      id: "gyne_emergency_valdai",
      priority: 72,
      when: all(
        SCENARIO("gyne_lt37"),
        HAS_TERRITORY,
        FALSE("critical"),
        VALDAI_TERRITORY,
      ),
      result: territorialResult(
        "gynTargets",
        [
          "Профиль: гинекология (<37 недель)",
          "Экстренная госпитализация по территории",
        ],
        ["Приказ 792-Д: столбец «Экстренная госпитализация»"],
        true,
        false,
        true,
      ),
    },
    {
      id: "gyne_emergency",
      priority: 73,
      when: all(
        SCENARIO("gyne_lt37"),
        HAS_TERRITORY,
        FALSE("critical"),
        NOT_VALDAI_TERRITORY,
      ),
      result: territorialResult(
        "gynTargets",
        [
          "Профиль: гинекология (<37 недель)",
          "Экстренная госпитализация по территории",
        ],
        ["Приказ 792-Д: столбец «Экстренная госпитализация»"],
        false,
        false,
        true,
      ),
    },
    {
      id: "obstetrics_critical_profile",
      priority: 80,
      when: all(
        SCENARIO("obstetrics_ge37"),
        HAS_TERRITORY,
        TRUE("critical"),
        { op: "eq", field: "criticalRoute", value: "profile_nokb" },
      ),
      result: criticalResult(true),
    },
    {
      id: "obstetrics_critical_kas",
      priority: 81,
      when: all(
        SCENARIO("obstetrics_ge37"),
        HAS_TERRITORY,
        TRUE("critical"),
        { op: "neq", field: "criticalRoute", value: "profile_nokb" },
      ),
      result: criticalResult(false),
    },
    {
      id: "obstetrics_preterm_nokpc",
      priority: 82,
      when: all(
        SCENARIO("obstetrics_ge37"),
        HAS_TERRITORY,
        TRUE("pretermLabor"),
        { op: "neq", field: "canDeliverToNokpc", value: false },
      ),
      result: {
        target: catalog("lpu", "NOKPC"),
        transport: "СМП (экстренно/неотложно)",
        callouts: ["Подозрение на преждевременные роды", "Цель: НОКПЦ"],
        sources: ["Преждевременные роды → НОКПЦ"],
      },
    },
    {
      id: "obstetrics_preterm_fallback",
      priority: 83,
      when: all(
        SCENARIO("obstetrics_ge37"),
        HAS_TERRITORY,
        TRUE("pretermLabor"),
        { op: "eq", field: "canDeliverToNokpc", value: false },
      ),
      result: {
        target: territoryTarget("nearestTargets"),
        alternative: catalog("lpu", "NOKPC"),
        transport: catalog("standardTerritoryTransport", {
          $field: "territoryGroupKey",
        }),
        callouts: [
          "Подозрение на преждевременные роды",
          "Доставка в НОКПЦ невозможна → ближайший стационар",
          "Параллельно: уведомление/вызов АРКЦ НОКПЦ при необходимости",
        ],
        sources: [
          "MVP: запасной вариант при невозможности доставки в НОКПЦ",
        ],
      },
    },
    {
      id: "obstetrics_mid_high_risk",
      priority: 84,
      when: all(
        SCENARIO("obstetrics_ge37"),
        HAS_TERRITORY,
        { op: "in", field: "riskDelivery", values: ["mid", "high"] },
      ),
      result: {
        target: catalog("lpu", "NOKPC"),
        transport: "СМП",
        callouts: [
          {
            $concat: [
              "Акушерство: риск ",
              catalog("riskLabels", { $field: "riskDelivery" }),
              " → НОКПЦ",
            ],
          },
        ],
        sources: ["Прил.2: средний/высокий риск → НОКПЦ"],
      },
    },
    {
      id: "obstetrics_low_risk_valdai",
      priority: 85,
      when: all(
        SCENARIO("obstetrics_ge37"),
        HAS_TERRITORY,
        { op: "eq", field: "riskDelivery", value: "low" },
        VALDAI_TERRITORY,
      ),
      result: territorialResult(
        "obstetricsLowRiskTargets",
        ["Акушерство: низкий риск → по территории"],
        [
          "Конспект: низкий риск (территории → НОКПЦ/Боровичи/Валдайский ММЦ)",
        ],
        true,
        true,
      ),
    },
    {
      id: "obstetrics_low_risk",
      priority: 86,
      when: all(
        SCENARIO("obstetrics_ge37"),
        HAS_TERRITORY,
        { op: "eq", field: "riskDelivery", value: "low" },
        NOT_VALDAI_TERRITORY,
      ),
      result: territorialResult(
        "obstetricsLowRiskTargets",
        ["Акушерство: низкий риск → по территории"],
        [
          "Конспект: низкий риск (территории → НОКПЦ/Боровичи/Валдайский ММЦ)",
        ],
        false,
      ),
    },
  ],
} as const satisfies RoutingRuleSetV1;
