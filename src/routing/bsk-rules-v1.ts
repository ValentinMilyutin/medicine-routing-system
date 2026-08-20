import type {
  RoutingConditionV1,
  RoutingRuleSetV1,
  RoutingRuleV1,
  RoutingTemplateV1,
} from "./rules-v1";

export const BSK_FACILITIES_V1 = {
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
} as const;

export const BSK_TERRITORIES_V1 = [
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
] as const;

export const BSK_BRANCH_LABELS_V1 = {
  stroke: "ОНМК / подозрение на инсульт",
  acs: "ОКС / подозрение на инфаркт",
  other_cvd: "Другие острые ССЗ",
  kink: "КИНК — критическая ишемия нижней конечности / угроза конечности",
} as const;

const TERRITORY_NAMES = BSK_TERRITORIES_V1.map(({ name }) => name);
const NOVGOROD_TERRITORIES = BSK_TERRITORIES_V1.filter(
  ({ group }) => group === "novgorod",
).map(({ name }) => name);
const NON_NOVGOROD_TERRITORIES = BSK_TERRITORIES_V1.filter(
  ({ group }) => group !== "novgorod",
).map(({ name }) => name);
const CGKB_KINK_SURGERY_TERRITORIES = [
  "Великий Новгород",
  "Новгородский",
  "Батецкий",
  "Маловишерский",
  "Чудовский",
  "Солецкий",
  "Шимский",
] as const;

const OTHER_CVD_TARGETS: Record<string, RoutingTemplateV1> = {};
const STROKE_ZONE_TARGETS: Record<string, RoutingTemplateV1> = {};
const ACS_ZONE_TARGETS: Record<string, RoutingTemplateV1> = {};
const KINK_SURGERY_TARGETS: Record<string, RoutingTemplateV1> = {};

for (const territory of BSK_TERRITORIES_V1) {
  const otherTarget =
    territory.group === "novgorod"
      ? BSK_FACILITIES_V1.cgkb1
      : territory.group === "borovichi"
        ? BSK_FACILITIES_V1.borovichi_crb
        : territory.group === "staraya_russa"
          ? BSK_FACILITIES_V1.staraya_russa_crb
          : BSK_FACILITIES_V1.valdai_mmc;
  OTHER_CVD_TARGETS[territory.name] = otherTarget;
  ACS_ZONE_TARGETS[territory.name] =
    territory.group === "novgorod"
      ? BSK_FACILITIES_V1.nokb
      : otherTarget;
  STROKE_ZONE_TARGETS[territory.name] =
    territory.group === "borovichi"
      ? BSK_FACILITIES_V1.borovichi_crb
      : territory.group === "staraya_russa" ||
          territory.name === "Демянский" ||
          territory.name === "Марёвский"
        ? BSK_FACILITIES_V1.staraya_russa_crb
        : BSK_FACILITIES_V1.cgkb1;
  KINK_SURGERY_TARGETS[territory.name] =
    CGKB_KINK_SURGERY_TERRITORIES.includes(
      territory.name as (typeof CGKB_KINK_SURGERY_TERRITORIES)[number],
    )
      ? BSK_FACILITIES_V1.cgkb1
      : BSK_FACILITIES_V1.nokb;
}

const catalog = (catalogId: string, key: RoutingTemplateV1) => ({
  $catalog: catalogId,
  key,
}) as const;
const territoryCatalog = (catalogId: string) =>
  catalog(catalogId, { $field: "territory" });

const VALID_TERRITORY: RoutingConditionV1 = {
  op: "in",
  field: "territory",
  values: TERRITORY_NAMES,
};
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

const HAS_SEVERE_MOTOR_DEFICIT: RoutingConditionV1 = {
  op: "any",
  conditions: [
    all(
      { op: "eq", field: "armMovement", value: "falls" },
      { op: "eq", field: "gripStrength", value: "absent" },
    ),
    all(
      TRUE("fastFace"),
      { op: "eq", field: "armMovement", value: "falls" },
      { op: "in", field: "gripStrength", values: ["weak", "absent"] },
    ),
    all(
      TRUE("fastFace"),
      { op: "eq", field: "armMovement", value: "drifts" },
      { op: "eq", field: "gripStrength", value: "absent" },
    ),
  ],
};
const NO_SEVERE_MOTOR_DEFICIT: RoutingConditionV1 = {
  op: "not",
  condition: HAS_SEVERE_MOTOR_DEFICIT,
};
const HAS_FAST_SIGN: RoutingConditionV1 = {
  op: "any",
  conditions: [TRUE("fastFace"), TRUE("fastArm"), TRUE("fastSpeech")],
};
const NO_FAST_SIGN: RoutingConditionV1 = {
  op: "not",
  condition: HAS_FAST_SIGN,
};

function strokeResult(
  severe: boolean,
  withinWindow: boolean,
  fastPositive: boolean,
): RoutingTemplateV1 {
  const higherLevel = severe || withinWindow;
  return {
    title: "Маршрутизация СМП при подозрении на ОНМК",
    target: higherLevel
      ? catalog("facilities", "nokb")
      : territoryCatalog("strokeZoneTargets"),
    ...(higherLevel
      ? { alternative: territoryCatalog("strokeZoneTargets") }
      : {}),
    urgency: withinWindow
      ? "Приоритетная эвакуация в пределах терапевтического окна."
      : "Экстренная эвакуация. Все пациенты с подозрением на ОНМК подлежат госпитализации.",
    transport:
      "СМП. При тяжёлом состоянии — реанимационная бригада по показаниям.",
    notify: [
      "Оповестить принимающее ПСО/РСЦ о пациенте с подозрением на ОНМК.",
      severe
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
    warnings: [],
  };
}

const STROKE_RULES: RoutingRuleV1[] = [];
let strokePriority = 100;
for (const severe of [false, true]) {
  for (const withinWindow of [false, true]) {
    for (const fastPositive of [false, true]) {
      STROKE_RULES.push({
        id: `stroke_${severe ? "severe" : "nonsevere"}_${withinWindow ? "window" : "outside"}_${fastPositive ? "fast" : "no_fast"}`,
        priority: strokePriority,
        when: all(
          VALID_TERRITORY,
          { op: "eq", field: "branch", value: "stroke" },
          severe ? HAS_SEVERE_MOTOR_DEFICIT : NO_SEVERE_MOTOR_DEFICIT,
          withinWindow ? TRUE("onsetWithin5h") : FALSE("onsetWithin5h"),
          fastPositive ? HAS_FAST_SIGN : NO_FAST_SIGN,
        ),
        result: strokeResult(severe, withinWindow, fastPositive),
      });
      strokePriority += 1;
    }
  }
}

function acsResult(
  stElevation: boolean,
  pciWithin120: boolean,
  tltContraindications: boolean,
  higherLevel: boolean,
  withAlternative: boolean,
): RoutingTemplateV1 {
  return {
    title: "Маршрутизация СМП при подозрении на ОКС",
    target: higherLevel
      ? catalog("facilities", "nokb")
      : territoryCatalog("acsZoneTargets"),
    ...(withAlternative
      ? { alternative: territoryCatalog("acsZoneTargets") }
      : {}),
    urgency: stElevation
      ? "ОКС с подъёмом ST: временной алгоритм реперфузии."
      : "ОКС без подъёма ST / неясный ОКС: маршрутизация по риску и зоне.",
    transport: "СМП. При нестабильности — ближайшая МО с реанимацией.",
    notify: [
      "Предупредить принимающую МО о пациенте с подозрением на ОКС.",
      stElevation
        ? "При подъёме ST сообщить время начала симптомов, время первого контакта и результат ЭКГ."
        : "Передать клинику, ЭКГ и признаки высокого риска.",
    ],
    checklist: [
      "Собрать анамнез и время начала симптомов.",
      "ЭКГ 12 отведений не позднее 10 минут от первого контакта.",
      "Определить: есть подъём ST / новая БЛНПГ / признаки заднего ИМ.",
      stElevation
        ? "Оценить возможность доставки на ЧКВ ≤ 120 минут."
        : "Оценить признаки высокого/очень высокого риска.",
      stElevation && !pciWithin120
        ? "Если ЧКВ ≤ 120 минут недоступно — рассмотреть ТЛТ, решение ≤ 20 минут."
        : "Если ЧКВ ≤ 120 минут доступно — приоритет РСЦ/ЧКВ.",
      tltContraindications
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
    warnings: [],
  };
}

const ACS_RULES: RoutingRuleV1[] = [];
let acsPriority = 200;
for (const stElevation of [false, true]) {
  for (const pciWithin120 of [false, true]) {
    for (const nsteHighRisk of [false, true]) {
      for (const tltContraindications of [false, true]) {
        const higherLevel = (stElevation && pciWithin120) || nsteHighRisk;
        const baseConditions = [
          VALID_TERRITORY,
          { op: "eq", field: "branch", value: "acs" } as RoutingConditionV1,
          stElevation ? TRUE("stElevation") : FALSE("stElevation"),
          pciWithin120 ? TRUE("pciWithin120") : FALSE("pciWithin120"),
          nsteHighRisk ? TRUE("nsteHighRisk") : FALSE("nsteHighRisk"),
          tltContraindications
            ? TRUE("tltContraindications")
            : FALSE("tltContraindications"),
        ];
        const suffix = `${stElevation ? "st" : "no_st"}_${pciWithin120 ? "pci" : "no_pci"}_${nsteHighRisk ? "high" : "standard"}_${tltContraindications ? "tlt_blocked" : "tlt_open"}`;
        if (higherLevel) {
          ACS_RULES.push({
            id: `acs_${suffix}_novgorod`,
            priority: acsPriority,
            when: all(
              ...baseConditions,
              { op: "in", field: "territory", values: NOVGOROD_TERRITORIES },
            ),
            result: acsResult(
              stElevation,
              pciWithin120,
              tltContraindications,
              true,
              false,
            ),
          });
          acsPriority += 1;
          ACS_RULES.push({
            id: `acs_${suffix}_outside_novgorod`,
            priority: acsPriority,
            when: all(
              ...baseConditions,
              {
                op: "in",
                field: "territory",
                values: NON_NOVGOROD_TERRITORIES,
              },
            ),
            result: acsResult(
              stElevation,
              pciWithin120,
              tltContraindications,
              true,
              true,
            ),
          });
        } else {
          ACS_RULES.push({
            id: `acs_${suffix}`,
            priority: acsPriority,
            when: all(...baseConditions),
            result: acsResult(
              stElevation,
              pciWithin120,
              tltContraindications,
              false,
              false,
            ),
          });
        }
        acsPriority += 1;
      }
    }
  }
}

const OTHER_CVD_FIELDS = [
  "rhythmDisorder",
  "conductionDisorder",
  "suspectedPE",
  "acuteHeartFailure",
] as const;

function otherCvdResult(flags: readonly boolean[]): RoutingTemplateV1 {
  return {
    title: "Маршрутизация СМП при других острых ССЗ",
    target: territoryCatalog("otherCvdTargets"),
    alternative: catalog("facilities", "nokb"),
    urgency: "Экстренно или неотложно по состоянию пациента.",
    transport: "СМП. При нестабильности — ближайшая МО с реанимацией.",
    notify: [
      "Предупредить принимающую МО.",
      "Сообщить ведущий синдром: аритмия / нарушение проводимости / ТЭЛА / острая СН.",
    ],
    checklist: [
      "Определить ведущий синдром.",
      flags[0]
        ? "Нарушение ритма отмечено."
        : "Оценить наличие нарушения ритма.",
      flags[1]
        ? "Нарушение проводимости отмечено."
        : "Оценить наличие нарушения проводимости.",
      flags[2] ? "Подозрение на ТЭЛА отмечено." : "Оценить признаки ТЭЛА.",
      flags[3]
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
    warnings: [],
  };
}

const OTHER_CVD_RULES: RoutingRuleV1[] = [];
let otherPriority = 300;
for (let mask = 0; mask < 16; mask += 1) {
  const flags = OTHER_CVD_FIELDS.map((_, index) => Boolean(mask & (1 << index)));
  OTHER_CVD_RULES.push({
    id: `other_cvd_${mask.toString(2).padStart(4, "0")}`,
    priority: otherPriority,
    when: all(
      VALID_TERRITORY,
      { op: "eq", field: "branch", value: "other_cvd" },
      ...OTHER_CVD_FIELDS.map((field, index) =>
        flags[index] ? TRUE(field) : FALSE(field),
      ),
    ),
    result: otherCvdResult(flags),
  });
  otherPriority += 1;
}

function kinkResult(
  pain: boolean,
  destructive: boolean,
  trophic: boolean,
): RoutingTemplateV1 {
  const probable = pain || destructive || trophic;
  return {
    title:
      "Маршрутизация СМП при подозрении на КИНК — критическую ишемию нижней конечности",
    target: pain
      ? catalog("facilities", "nokb")
      : destructive
        ? territoryCatalog("kinkSurgeryTargets")
        : territoryCatalog("otherCvdTargets"),
    alternative: pain
      ? territoryCatalog("kinkSurgeryTargets")
      : catalog("facilities", "nokb"),
    urgency: pain
      ? "Срочная сосудистая маршрутизация: боль покоя / высокая вероятность КИНК."
      : destructive
        ? "Срочная хирургическая оценка: некроз, гангрена или инфекционно-воспалительные изменения."
        : probable
          ? "Требуется оценка вероятности КИНК и сосудисто-хирургическое согласование по показаниям."
          : "КИНК не подтверждена введёнными признаками; требуется клиническая оценка.",
    transport: "СМП / медицинский транспорт по состоянию пациента.",
    notify: [
      pain
        ? "При боли покоя или высокой вероятности КИНК — согласовать маршрут с сосудистым хирургом НОКБ / РЦ КИНК."
        : "Предупредить принимающую МО и передать признаки угрозы конечности.",
      destructive
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
    warnings: [],
  };
}

const HAS_KINK_PAIN: RoutingConditionV1 = {
  op: "any",
  conditions: [TRUE("restPain"), TRUE("legDownAtNight")],
};
const NO_KINK_PAIN: RoutingConditionV1 = {
  op: "not",
  condition: HAS_KINK_PAIN,
};
const HAS_KINK_DESTRUCTION: RoutingConditionV1 = {
  op: "any",
  conditions: [TRUE("necrosisGangrene"), TRUE("infectionSigns")],
};
const NO_KINK_DESTRUCTION: RoutingConditionV1 = {
  op: "not",
  condition: HAS_KINK_DESTRUCTION,
};

const KINK_RULES: RoutingRuleV1[] = [
  {
    id: "kink_pain_destructive",
    priority: 400,
    when: all(
      VALID_TERRITORY,
      { op: "eq", field: "branch", value: "kink" },
      HAS_KINK_PAIN,
      HAS_KINK_DESTRUCTION,
    ),
    result: kinkResult(true, true, false),
  },
  {
    id: "kink_pain",
    priority: 401,
    when: all(
      VALID_TERRITORY,
      { op: "eq", field: "branch", value: "kink" },
      HAS_KINK_PAIN,
      NO_KINK_DESTRUCTION,
    ),
    result: kinkResult(true, false, false),
  },
  {
    id: "kink_destructive",
    priority: 402,
    when: all(
      VALID_TERRITORY,
      { op: "eq", field: "branch", value: "kink" },
      NO_KINK_PAIN,
      HAS_KINK_DESTRUCTION,
    ),
    result: kinkResult(false, true, false),
  },
  {
    id: "kink_trophic",
    priority: 403,
    when: all(
      VALID_TERRITORY,
      { op: "eq", field: "branch", value: "kink" },
      NO_KINK_PAIN,
      NO_KINK_DESTRUCTION,
      TRUE("trophicChanges"),
    ),
    result: kinkResult(false, false, true),
  },
  {
    id: "kink_without_criteria",
    priority: 404,
    when: all(
      VALID_TERRITORY,
      { op: "eq", field: "branch", value: "kink" },
      NO_KINK_PAIN,
      NO_KINK_DESTRUCTION,
      FALSE("trophicChanges"),
    ),
    result: kinkResult(false, false, false),
  },
];

export const BSK_RULE_SET_V1 = {
  schemaVersion: 1,
  id: "bsk.v1",
  profileId: "bsk",
  catalogs: {
    facilities: BSK_FACILITIES_V1,
    otherCvdTargets: OTHER_CVD_TARGETS,
    strokeZoneTargets: STROKE_ZONE_TARGETS,
    acsZoneTargets: ACS_ZONE_TARGETS,
    kinkSurgeryTargets: KINK_SURGERY_TARGETS,
  },
  rules: [
    {
      id: "unstable_vitals",
      priority: 10,
      when: all(VALID_TERRITORY, TRUE("unstableVitals")),
      result: {
        title: "Нестабильный пациент: приоритет ближайшей МО с реанимацией",
        target: catalog("facilities", "nearest_reanimation"),
        alternative: territoryCatalog("otherCvdTargets"),
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
        warnings: [],
      },
    },
    ...STROKE_RULES,
    ...ACS_RULES,
    ...OTHER_CVD_RULES,
    ...KINK_RULES,
  ],
} satisfies RoutingRuleSetV1;
