import type {
  RoutingBranchDescriptor,
  RoutingProfileContentDocument,
  RoutingQuestionDescriptor,
  RoutingSourceDescriptor,
} from "./content-schema.js";
import {
  INFECTIOUS_ADMISSION_LABELS_V1,
  INFECTIOUS_GROUP_LABELS_V1,
  INFECTIOUS_LIFE_THREAT_LABELS_V1,
  INFECTIOUS_RESPIRATORY_ADMISSION_LABELS_V1,
  INFECTIOUS_TERRITORIES_V1,
} from "./infectious-rules-v1.js";
import {
  ROAD_ACCIDENT_AGE_LABELS_V1,
  ROAD_ACCIDENT_INJURY_LABELS_V1,
  ROAD_ACCIDENT_M11_RESPONDER_LABELS_V1,
  ROAD_ACCIDENT_M11_ZONES_V1,
  ROAD_ACCIDENT_TERRITORIES_V1,
} from "./road-accident-rules-v1.js";
import {
  DERMATOLOGY_CONDITION_LABELS,
  DERMATOLOGY_TERRITORIES,
} from "./dermatology-rules-v1.js";
import {
  BSK_BRANCH_LABELS_V1,
  BSK_TERRITORIES_V1,
} from "./bsk-rules-v1.js";
import {
  ONCOLOGY_SIGN_LABELS_V1,
  ONCOLOGY_TERRITORY_OPTIONS_V1,
} from "./oncology-rules-v1.js";
import {
  OBSTETRICS_TERRITORIES_BOROVICHI_V1,
  OBSTETRICS_TERRITORIES_NOVGOROD_V1,
  OBSTETRICS_TERRITORIES_STARAYA_RUSSA_V1,
  OBSTETRICS_TERRITORIES_VALDAI_V1,
} from "./obstetrics-rules-v1.js";

const UPDATED_AT = "2026-08-20T19:00:00+03:00";

function question(
  id: string,
  label: string,
  kind: RoutingQuestionDescriptor["kind"],
  requirement: RoutingQuestionDescriptor["requirement"],
  optionCatalog?: string,
  extra: Partial<
    Pick<
      RoutingQuestionDescriptor,
      "helpText" | "placeholder" | "visibility" | "options"
    >
  > = {},
): RoutingQuestionDescriptor {
  return { id, label, kind, requirement, optionCatalog, ...extra };
}

function booleanOptions(
  yes = "Да",
  no = "Нет",
): RoutingQuestionDescriptor["options"] {
  return [
    { value: true, label: yes },
    { value: false, label: no },
  ];
}

function branch(
  id: string,
  title: string,
  priority: number,
  conditionSummary: string,
  outcomeSummary: string,
  sourceIds: readonly string[],
  curatorQuestionIds: readonly string[] = [],
): RoutingBranchDescriptor {
  return {
    id,
    title,
    priority,
    conditionSummary,
    outcomeSummary,
    sourceIds,
    curatorQuestionIds,
  };
}

function regionalSource(
  id: string,
  label: string,
  verificationStatus: RoutingSourceDescriptor["verificationStatus"] =
    "needs_confirmation",
): RoutingSourceDescriptor {
  return {
    id,
    label,
    authority: "regional",
    official: true,
    verificationStatus,
  };
}

function federalSource(
  id: string,
  label: string,
  url: string,
): RoutingSourceDescriptor {
  return {
    id,
    label,
    authority: "federal",
    official: true,
    verificationStatus: "verified",
    url,
  };
}

const OBSTETRICS_SOURCE = regionalSource(
  "novgorod-792-d",
  "Приказ Министерства здравоохранения Новгородской области № 792-Д",
);

export const obstetricsRoutingContent = {
  schemaVersion: 1,
  contentVersion: "0.3.0-draft.1",
  status: "draft",
  profileId: "obgyn",
  audience: "obstetric",
  updatedAt: UPDATED_AT,
  changeSummary: "Первичная фиксация вопросов и приоритетов действующего MVP.",
  officialSourcesOnly: true,
  questions: [
    question("scenario", "Клинический сценарий", "single_choice", "always", "obstetric-scenarios", { options: [
      { value: "gyne_lt37", label: "Гинекология / беременность менее 37 недель" },
      { value: "obstetrics_ge37", label: "Акушерство: 37 недель и более / роды" },
      { value: "postpartum_le42", label: "Послеродовый период до 42 дней" },
    ] }),
    question("territory", "Территория вызова", "single_choice", "always", "novgorod-territories", {
      options: [...new Set([
        ...OBSTETRICS_TERRITORIES_NOVGOROD_V1,
        ...OBSTETRICS_TERRITORIES_BOROVICHI_V1,
        ...OBSTETRICS_TERRITORIES_STARAYA_RUSSA_V1,
        ...OBSTETRICS_TERRITORIES_VALDAI_V1,
        "Мошенской район",
        "Пестово",
      ])].map((value) => ({ value, label: value })),
    }),
    question("critical", "Есть критическое состояние или угроза жизни", "boolean", "always", undefined, { options: booleanOptions() }),
    question("criticalKind", "Вид критического состояния", "single_choice", "optional", "obstetric-critical-kinds", {
      visibility: { op: "eq", field: "critical", value: true },
      options: [
        { value: "bleeding", label: "Кровотечение" },
        { value: "preeclampsia_eclampsia", label: "Преэклампсия / эклампсия / судороги" },
        { value: "sepsis_shock", label: "Сепсис / шок" },
        { value: "resp_failure", label: "Дыхательная недостаточность" },
        { value: "teo_cardiac", label: "ТЭО / кардиальная декомпенсация" },
        { value: "other", label: "Другое критическое состояние" },
      ],
    }),
    question("criticalRoute", "Профиль критического маршрута", "single_choice", "conditional", "obstetric-critical-routes", {
      visibility: { op: "all", conditions: [
        { op: "eq", field: "critical", value: true },
        { op: "in", field: "scenario", values: ["obstetrics_ge37", "postpartum_le42"] },
      ] },
      options: [
        { value: "kas_arkc", label: "Критическое акушерское состояние → НОКПЦ / АРКЦ" },
        { value: "profile_nokb", label: "Экстрагенитальная или профильная критика → НОКБ" },
      ],
    }),
    question("infectionType", "Инфекционный синдром", "single_choice", "always", "obstetric-infections", { options: [
      { value: "none", label: "Инфекционного синдрома нет", exclusive: true },
      { value: "arvi_pneumo", label: "ОРВИ / пневмония" },
      { value: "flu_covid", label: "Грипп / COVID-19" },
    ] }),
    question("infectionSevere", "Тяжёлое течение ОРВИ / пневмонии", "boolean", "conditional", undefined, {
      visibility: { op: "eq", field: "infectionType", value: "arvi_pneumo" }, options: booleanOptions(),
    }),
    question("infectionOver7Days", "Болезнь длится более 7 дней", "boolean", "conditional", undefined, {
      visibility: { op: "all", conditions: [{ op: "eq", field: "infectionType", value: "arvi_pneumo" }, { op: "eq", field: "infectionSevere", value: true }] }, options: booleanOptions(),
    }),
    question("trauma", "Есть ДТП или травма", "boolean", "always", undefined, { options: booleanOptions() }),
    question("traumaSevere", "Тяжёлая травма или политравма", "boolean", "conditional", undefined, {
      visibility: { op: "eq", field: "trauma", value: true }, options: booleanOptions(),
    }),
    question("surgery", "Есть острая экстрагенитальная хирургическая патология", "boolean", "always", undefined, { options: booleanOptions() }),
    question("surgeryLifeThreat", "Хирургическая патология угрожает жизни", "boolean", "conditional", undefined, {
      visibility: { op: "eq", field: "surgery", value: true }, options: booleanOptions(),
    }),
    question("surgeryProfile", "Хирургический профиль", "single_choice", "conditional", "surgery-profiles", {
      visibility: { op: "all", conditions: [
        { op: "eq", field: "surgery", value: true }, { op: "eq", field: "surgeryLifeThreat", value: true }, { op: "eq", field: "scenario", value: "gyne_lt37" },
      ] },
      options: [
        { value: "city", label: "Абдоминальная / гнойная хирургия / травма → ЦГКБ" },
        { value: "regional", label: "Кардио / нейро / высокоспециализированная помощь → НОКБ" },
      ],
    }),
    question("extragenitalInpatient", "Тяжёлая экстрагенитальная патология требует профильного стационара", "boolean", "always", undefined, { options: booleanOptions() }),
    question("pretermLabor", "Есть подозрение на преждевременные роды", "boolean", "conditional", undefined, {
      visibility: { op: "all", conditions: [
        { op: "eq", field: "scenario", value: "obstetrics_ge37" }, { op: "eq", field: "infectionType", value: "none" },
        { op: "eq", field: "trauma", value: false }, { op: "eq", field: "surgery", value: false },
        { op: "eq", field: "extragenitalInpatient", value: false }, { op: "eq", field: "critical", value: false },
      ] }, options: booleanOptions(),
    }),
    question("canDeliverToNokpc", "Возможна доставка в НОКПЦ", "boolean", "conditional", undefined, {
      visibility: { op: "all", conditions: [
        { op: "eq", field: "scenario", value: "obstetrics_ge37" }, { op: "eq", field: "infectionType", value: "none" },
        { op: "eq", field: "trauma", value: false }, { op: "eq", field: "surgery", value: false }, { op: "eq", field: "extragenitalInpatient", value: false },
        { op: "eq", field: "critical", value: false }, { op: "eq", field: "pretermLabor", value: true },
      ] }, options: booleanOptions(),
    }),
    question("riskDelivery", "Группа риска родов", "single_choice", "conditional", "delivery-risk", {
      visibility: { op: "all", conditions: [
        { op: "eq", field: "scenario", value: "obstetrics_ge37" }, { op: "eq", field: "infectionType", value: "none" },
        { op: "eq", field: "trauma", value: false }, { op: "eq", field: "surgery", value: false }, { op: "eq", field: "extragenitalInpatient", value: false },
        { op: "eq", field: "critical", value: false }, { op: "eq", field: "pretermLabor", value: false },
      ] },
      options: [{ value: "low", label: "Низкий риск" }, { value: "mid", label: "Средний риск" }, { value: "high", label: "Высокий риск" }],
    }),
    question("postpartumIssue", "Послеродовое осложнение", "single_choice", "conditional", "postpartum-issues", {
      visibility: { op: "all", conditions: [
        { op: "eq", field: "scenario", value: "postpartum_le42" }, { op: "eq", field: "infectionType", value: "none" },
        { op: "eq", field: "trauma", value: false }, { op: "eq", field: "surgery", value: false }, { op: "eq", field: "extragenitalInpatient", value: false },
        { op: "eq", field: "critical", value: false },
      ] },
      options: [
        { value: "bleeding", label: "Кровотечение" }, { value: "sepsis_fever", label: "Температура / подозрение на сепсис" },
        { value: "seizures_hypertensive", label: "Судороги / гипертензивные осложнения" }, { value: "resp_failure", label: "Дыхательная недостаточность" },
        { value: "teo_cardiac", label: "ТЭО / кардиальные осложнения" }, { value: "postop_pain_other", label: "Другое / послеоперационное осложнение / боль" },
      ],
    }),
  ],
  branches: [
    branch("infection", "Инфекционная ветка", 10, "Выбран инфекционный синдром.", "Инфекционный стационар или профильный маршрут по тяжести.", [OBSTETRICS_SOURCE.id], ["OBS-001", "OBS-002"]),
    branch("trauma", "Травматологическая ветка", 20, "Отмечена травма без более приоритетной инфекции.", "Травмоцентр либо ближайшая больница по тяжести.", [OBSTETRICS_SOURCE.id], ["OBS-001", "OBS-002"]),
    branch("surgery", "Хирургическая ветка", 30, "Отмечена острая хирургическая патология.", "Профильный хирургический стационар.", [OBSTETRICS_SOURCE.id], ["OBS-001", "OBS-002"]),
    branch("extragenital", "Тяжёлая экстрагенитальная патология", 40, "Показано стационарное лечение экстрагенитальной патологии.", "НОКБ.", [OBSTETRICS_SOURCE.id], ["OBS-001", "OBS-002"]),
    branch("critical", "Критическое акушерское состояние", 50, "Есть критическое состояние и не сработали более приоритетные ветки.", "Критический акушерский или профильный маршрут.", [OBSTETRICS_SOURCE.id], ["OBS-002"]),
    branch("gynecology", "Гинекология до 37 недель", 100, "Обычный гинекологический сценарий.", "Территориальный гинекологический стационар.", [OBSTETRICS_SOURCE.id]),
    branch("preterm", "Преждевременные роды", 110, "Отмечены преждевременные роды.", "НОКПЦ либо запасной территориальный маршрут.", [OBSTETRICS_SOURCE.id], ["OBS-003"]),
    branch("delivery", "Роды от 37 недель", 120, "Выбрана группа риска родов.", "Родильный стационар по территории и риску.", [OBSTETRICS_SOURCE.id]),
    branch("postpartum", "Послеродовое осложнение", 130, "Осложнение в течение 42 дней после родов.", "Профильный стационар по типу осложнения.", [OBSTETRICS_SOURCE.id], ["OBS-004"]),
  ],
  sources: [OBSTETRICS_SOURCE],
  blockingCuratorQuestionIds: ["OBS-001", "OBS-002", "OBS-003", "OBS-004"],
  execution: {
    kind: "rules_v1",
    ruleSetId: "obstetrics.v1",
  },
} satisfies RoutingProfileContentDocument;

const BSK_SOURCE = regionalSource(
  "novgorod-1368-d",
  "Приказ Министерства здравоохранения Новгородской области № 1368-Д",
);

export const bskRoutingContent = {
  schemaVersion: 1,
  contentVersion: "0.3.0-draft.1",
  status: "draft",
  profileId: "bsk",
  audience: "adults",
  updatedAt: UPDATED_AT,
  changeSummary: "Фиксация веток ОНМК, ОКС, других ССЗ и КИНК.",
  officialSourcesOnly: true,
  questions: [
    question("territory", "Территория вызова", "single_choice", "always", "novgorod-territories", {
      options: BSK_TERRITORIES_V1.map(({ name }) => ({ value: name, label: name })),
    }),
    question("branch", "Ведущий сердечно-сосудистый синдром", "single_choice", "always", "bsk-branches", {
      options: Object.entries(BSK_BRANCH_LABELS_V1).map(([value, label]) => ({ value, label })),
    }),
    question("unstableVitals", "Есть выраженные нарушения витальных функций", "boolean", "always", undefined, {
      helpText: "Шок, критическая гипотензия, тяжёлая дыхательная недостаточность, угроза остановки кровообращения или необходимость реанимации.",
      options: booleanOptions(),
    }),
    ...(["fastFace", "fastArm", "fastSpeech"] as const).map((id) => question(
      id,
      id === "fastFace" ? "Есть асимметрия лица" : id === "fastArm" ? "Есть слабость или онемение одной руки" : "Есть нарушение речи",
      "boolean",
      "conditional",
      undefined,
      { visibility: { op: "eq", field: "branch", value: "stroke" }, options: booleanOptions() },
    )),
    question("strokeOnset", "Когда появились неврологические симптомы?", "single_choice", "conditional", "stroke-onset", {
      visibility: { op: "eq", field: "branch", value: "stroke" },
      options: [
        { value: "known", label: "Точное время начала известно" },
        { value: "woke_with_symptoms", label: "Пациент проснулся уже с симптомами" },
        { value: "unknown", label: "Время начала неизвестно" },
      ],
    }),
    question("onsetWithin5h", "Доставка возможна не позднее пяти часов от начала симптомов", "boolean", "conditional", undefined, {
      visibility: { op: "all", conditions: [{ op: "eq", field: "branch", value: "stroke" }, { op: "eq", field: "strokeOnset", value: "known" }] },
      options: booleanOptions(),
    }),
    question("armMovement", "Как пациент удерживает вытянутую руку?", "single_choice", "conditional", "arm-movement", {
      visibility: { op: "eq", field: "branch", value: "stroke" },
      options: [
        { value: "holds", label: "Удерживает руку" },
        { value: "drifts", label: "Рука постепенно опускается" },
        { value: "falls", label: "Рука быстро падает или не удерживается" },
      ],
    }),
    question("gripStrength", "Сила сжатия кисти", "single_choice", "conditional", "grip-strength", {
      visibility: { op: "eq", field: "branch", value: "stroke" },
      options: [
        { value: "normal", label: "Сила сохранена" },
        { value: "weak", label: "Сила снижена" },
        { value: "absent", label: "Сжатие кисти отсутствует" },
      ],
    }),
    ...([
      ["chestPainOrEquivalent", "Боль в грудной клетке или эквивалент ОКС"],
      ["ecgDone", "ЭКГ 12 отведений выполнена"],
      ["stElevation", "Есть подъём ST / новая БЛНПГ / признаки заднего ИМ"],
      ["pciWithin120", "Доставка на ЧКВ возможна в пределах 120 минут"],
      ["tltContraindications", "Есть противопоказания к ТЛТ"],
      ["nsteHighRisk", "ОКС без подъёма ST высокого или очень высокого риска"],
    ] as const).map(([id, label]) => question(id, label, "boolean", "conditional", undefined, {
      visibility: { op: "eq", field: "branch", value: "acs" }, options: booleanOptions(),
    })),
    ...([
      ["rhythmDisorder", "Нарушение ритма"],
      ["conductionDisorder", "Нарушение проводимости"],
      ["suspectedPE", "Подозрение на ТЭЛА"],
      ["acuteHeartFailure", "Острая сердечная недостаточность"],
    ] as const).map(([id, label]) => question(id, label, "boolean", "conditional", undefined, {
      visibility: { op: "eq", field: "branch", value: "other_cvd" }, options: booleanOptions(),
    })),
    ...([
      ["restPain", "Боль в нижней конечности в покое"],
      ["legDownAtNight", "Пациент опускает ногу ночью для уменьшения боли"],
      ["trophicChanges", "Есть трофические изменения или язвы"],
      ["necrosisGangrene", "Некроз или гангрена"],
      ["infectionSigns", "Инфекционно-воспалительные изменения"],
    ] as const).map(([id, label]) => question(id, label, "boolean", "conditional", undefined, {
      visibility: { op: "eq", field: "branch", value: "kink" }, options: booleanOptions(),
    })),
  ],
  branches: [
    branch("unstable", "Нестабильный пациент", 10, "Нарушены витальные функции.", "Ближайшая согласованная ОАРИТ, затем профильная маршрутизация.", [BSK_SOURCE.id], ["BSK-001"]),
    branch("stroke_nokb", "ОНМК — прямой областной маршрут", 20, "Терапевтическое окно или выраженный двигательный дефицит.", "НОКБ / РСЦ.", [BSK_SOURCE.id], ["BSK-002", "BSK-004"]),
    branch("stroke_territorial", "ОНМК — территориальный ПСО", 30, "Подозрение на ОНМК без критерия прямого областного маршрута.", "ПСО по территориальной матрице.", [BSK_SOURCE.id], ["BSK-004"]),
    branch("acs_nokb", "ОКС — прямой ЧКВ-маршрут", 40, "Подъём ST с доступным ЧКВ или ОКС высокого риска.", "НОКБ / ЧКВ-центр.", [BSK_SOURCE.id], ["BSK-004"]),
    branch("acs_territorial", "ОКС — территориальный маршрут", 50, "ОКС без критерия прямого областного маршрута.", "Стационар по территориальной матрице.", [BSK_SOURCE.id], ["BSK-004"]),
    branch("other_cvd", "Другие острые ССЗ", 60, "Выбрана ветка аритмии, проводимости, ТЭЛА или острой СН.", "Опорный стационар территории.", [BSK_SOURCE.id], ["BSK-004"]),
    branch("kink_vascular", "КИНК — сосудистый маршрут", 70, "Боль покоя без хирургического критерия.", "Сосудистый центр НОКБ.", [BSK_SOURCE.id], ["BSK-003"]),
    branch("kink_surgery", "КИНК — хирургический маршрут", 80, "Некроз или гангрена.", "Хирургический стационар по территории.", [BSK_SOURCE.id], ["BSK-003"]),
    branch("kink_assessment", "КИНК — территориальная оценка", 90, "Нет критериев прямого сосудистого или хирургического маршрута.", "Территориальный стационар.", [BSK_SOURCE.id], ["BSK-003"]),
  ],
  sources: [BSK_SOURCE],
  blockingCuratorQuestionIds: ["BSK-001", "BSK-002", "BSK-003", "BSK-004"],
  execution: {
    kind: "rules_v1",
    ruleSetId: "bsk.v1",
  },
} satisfies RoutingProfileContentDocument;

const ONCOLOGY_SOURCE = regionalSource(
  "novgorod-oncology-routing",
  "Действующий региональный порядок маршрутизации пациентов с онкологическими заболеваниями",
);

export const oncologyRoutingContent = {
  schemaVersion: 1,
  contentVersion: "0.3.0-draft.1",
  status: "draft",
  profileId: "oncology",
  audience: "adults",
  updatedAt: UPDATED_AT,
  changeSummary: "Фиксация восьми конечных категорий онкологического профиля.",
  officialSourcesOnly: true,
  questions: [
    question("territory", "Территория вызова", "single_choice", "always", "novgorod-territories", {
      placeholder: "Выберите муниципальный район или город",
      options: ONCOLOGY_TERRITORY_OPTIONS_V1.map((value) => ({ value, label: value })),
    }),
    question("oncologyStatus", "Онкологический статус", "single_choice", "always", "oncology-status", {
      options: [
        { value: "confirmed_known", label: "Установленное злокачественное новообразование" },
        { value: "suspected_only", label: "Только подозрение на злокачественное новообразование" },
        { value: "unknown", label: "Статус неизвестен / данных недостаточно" },
      ],
    }),
    question("leadingSigns", "Ведущие синдромы и признаки", "multiple_choice", "optional", "oncology-leading-signs", {
      helpText: "Отметьте все признаки, которые доступны оценке бригады СМП. Если признаков нет, оставьте список пустым.",
      options: Object.entries(ONCOLOGY_SIGN_LABELS_V1).map(([value, label]) => ({ value, label })),
    }),
    question("medicalTransportNeeded", "Требуется медицинская перевозка", "boolean", "optional", undefined, {
      helpText: "Пациент стабилен, но самостоятельно не может добраться до медицинской организации.",
      options: booleanOptions(),
    }),
    question("palliativeProfileKnown", "Известен паллиативный профиль", "boolean", "optional", undefined, {
      options: booleanOptions(),
    }),
    question("palliativeFormat", "Формат паллиативной помощи", "single_choice", "optional", "palliative-format", {
      visibility: { op: "eq", field: "palliativeProfileKnown", value: true },
      options: [
        { value: "outpatient", label: "Амбулаторно / выездная паллиативная помощь" },
        { value: "inpatient", label: "Паллиативный стационар" },
        { value: "nursing_care", label: "Койки сестринского ухода" },
      ],
    }),
    question("docsAvailable", "Медицинские документы паллиативного профиля доступны", "boolean", "optional", undefined, {
      visibility: { op: "eq", field: "palliativeProfileKnown", value: true },
      options: booleanOptions(),
    }),
  ],
  branches: [
    branch("vascular_cardiac", "Инфаркт или ОНМК", 10, "Есть признаки инфаркта миокарда или ОНМК.", "Профильный сосудистый или кардиологический стационар.", [ONCOLOGY_SOURCE.id], ["ONC-001"]),
    branch("urgent_oncosurgery", "Срочная онкохирургия", 20, "Хирургический синдром при известном онкологическом заболевании.", "Профильный онкохирургический маршрут.", [ONCOLOGY_SOURCE.id], ["ONC-004"]),
    branch("urgent_surgery", "Срочная общая хирургия", 30, "Хирургический синдром без подтверждённого онкологического статуса.", "Опорный хирургический стационар.", [ONCOLOGY_SOURCE.id], ["ONC-004"]),
    branch("general_emergency", "Общая неотложность", 40, "Есть общие угрожающие симптомы без более приоритетного синдрома.", "Опорный многопрофильный стационар.", [ONCOLOGY_SOURCE.id], ["ONC-004"]),
    branch("palliative", "Паллиативная помощь", 50, "Паллиативный симптом без иной угрозы жизни.", "Паллиативный контур по территории и формату.", [ONCOLOGY_SOURCE.id], ["ONC-002", "ONC-003"]),
    branch("medical_transport", "Медицинская перевозка", 60, "Нет экстренной ветки, но требуется медицинская перевозка.", "Опорный стационар или согласованный пункт.", [ONCOLOGY_SOURCE.id], ["ONC-004"]),
    branch("planned_oncology", "Плановый онкологический контур", 70, "Нет экстренных показаний, требуется онкологическое направление.", "ПОК или ЦАОП территории.", [ONCOLOGY_SOURCE.id], ["ONC-002"]),
    branch("no_hospitalization", "Оставление на месте", 80, "Нет показаний к госпитализации или перевозке.", "Рекомендации и плановый онкологический контур.", [ONCOLOGY_SOURCE.id], ["ONC-002"]),
  ],
  sources: [ONCOLOGY_SOURCE],
  blockingCuratorQuestionIds: ["ONC-001", "ONC-002", "ONC-003", "ONC-004"],
  execution: {
    kind: "rules_v1",
    ruleSetId: "oncology.v1",
  },
} satisfies RoutingProfileContentDocument;

const DERM_REGIONAL = regionalSource(
  "novgorod-98-d",
  "Приказ Министерства здравоохранения Новгородской области от 01.02.2022 № 98-Д",
);
const DERM_FEDERAL = federalSource(
  "minzdrav-582n",
  "Приказ Минздрава России от 24.09.2025 № 582н",
  "https://publication.pravo.gov.ru/document/0001202510280015",
);
const EMERGENCY_FEDERAL = federalSource(
  "minzdrav-388n",
  "Приказ Минздрава России от 20.06.2013 № 388н",
  "https://minzdrav.gov.ru/ministry/61/3/stranitsa-992/prikaz-minzdrava-rossii-ot-20-06-2013-n-388n-red-ot-21-02-2020-ob-utverzhdenii-poryadka-okazaniya-skoroy-v-tom-chisle-skoroy-spetsializirovannoy-meditsinskoy-pomoschi",
);

export const dermatologyRoutingContent = {
  schemaVersion: 1,
  contentVersion: "0.3.0-draft.1",
  status: "draft",
  profileId: "dermatology",
  audience: "all",
  updatedAt: UPDATED_AT,
  changeSummary: "Фиксация экстренной, стационарной и амбулаторной веток.",
  officialSourcesOnly: true,
  questions: [
    question("territory", "Территория вызова", "single_choice", "always", "novgorod-territories", {
      options: DERMATOLOGY_TERRITORIES.map(({ name }) => ({ value: name, label: name })),
    }),
    question("condition", "Опасное состояние", "single_choice", "always", "dermatology-emergencies", {
      options: Object.entries(DERMATOLOGY_CONDITION_LABELS).map(([value, label]) => ({ value, label })),
    }),
    question("inpatientCare", "Показана стационарная помощь", "boolean", "conditional", undefined, {
      visibility: { op: "eq", field: "condition", value: "none" },
      options: [
        { value: true, label: "Да, требуется профильный стационар" },
        { value: false, label: "Нет, возможен амбулаторный маршрут" },
      ],
    }),
  ],
  branches: [
    branch("emergency_icu", "Жизнеугрожающее состояние", 10, "Выбрано одно из четырёх опасных состояний.", "Ближайшая согласованная ОАРИТ или ПИТ; после стабилизации — НОКВД.", [DERM_REGIONAL.id, DERM_FEDERAL.id, EMERGENCY_FEDERAL.id], ["DERM-001", "DERM-002"]),
    branch("inpatient", "Профильный стационар", 20, "Опасные состояния исключены, стационарная помощь показана.", "Стационар НОКВД.", [DERM_REGIONAL.id, DERM_FEDERAL.id], ["DERM-001", "DERM-003"]),
    branch("outpatient", "Амбулаторный маршрут", 30, "Опасные состояния исключены, стационарная помощь не показана.", "Территориальный дерматовенерологический кабинет.", [DERM_REGIONAL.id, DERM_FEDERAL.id], ["DERM-001", "DERM-003"]),
  ],
  sources: [DERM_REGIONAL, DERM_FEDERAL, EMERGENCY_FEDERAL],
  blockingCuratorQuestionIds: ["DERM-001", "DERM-002", "DERM-003"],
  execution: {
    kind: "rules_v1",
    ruleSetId: "dermatology.v1",
  },
} satisfies RoutingProfileContentDocument;

const INFECTIOUS_REGIONAL = regionalSource(
  "novgorod-302-d",
  "Приказ Министерства здравоохранения Новгородской области от 18.03.2022 № 302-Д",
);
const INFECTIOUS_SEASONAL = regionalSource(
  "novgorod-920-d",
  "Приказ Министерства здравоохранения Новгородской области от 28.08.2025 № 920-Д",
  "season_expired",
);
const INFECTIOUS_FEDERAL = federalSource(
  "minzdrav-adult-infectious-2025",
  "Действующий федеральный порядок оказания медицинской помощи взрослым при инфекционных заболеваниях",
  "https://publication.pravo.gov.ru/document/0001202509230019",
);

export const infectiousRoutingContent = {
  schemaVersion: 1,
  contentVersion: "0.3.0-draft.1",
  status: "draft",
  profileId: "infectious",
  audience: "adults",
  updatedAt: UPDATED_AT,
  changeSummary: "Фиксация взрослого инфекционного профиля и сезонного ограничения.",
  officialSourcesOnly: true,
  questions: [
    question(
      "territory",
      "Территория вызова",
      "single_choice",
      "always",
      "novgorod-territories",
      {
        helpText: "Муниципальный район или округ, откуда забирают пациента.",
        placeholder: "Выберите территорию",
        options: INFECTIOUS_TERRITORIES_V1.map((territory) => ({
          value: territory.name,
          label: territory.name,
        })),
      },
    ),
    question(
      "infectionGroup",
      "Группа инфекционного заболевания",
      "single_choice",
      "always",
      "infection-groups",
      {
        helpText:
          "Отдельная сезонная схема действует только для перечисленных респираторных инфекций.",
        options: Object.entries(INFECTIOUS_GROUP_LABELS_V1).map(
          ([value, label]) => ({ value, label }),
        ),
      },
    ),
    question(
      "lifeThreats",
      "Жизнеугрожающие состояния",
      "multiple_choice",
      "always",
      "infection-life-threats",
      {
        helpText: "Отметьте все выявленные признаки или укажите, что их нет.",
        options: Object.entries(INFECTIOUS_LIFE_THREAT_LABELS_V1).map(
          ([value, label]) => ({
            value,
            label,
            exclusive: value === "none",
          }),
        ),
      },
    ),
    question(
      "admissionCriteria",
      "Показания к стационарному лечению",
      "multiple_choice",
      "conditional",
      "infection-admission-criteria",
      {
        helpText:
          "Отметьте все подходящие критерии. При отсутствии показаний выберите последний вариант.",
        visibility: { op: "includes", field: "lifeThreats", value: "none" },
        options: [
          ...Object.entries(INFECTIOUS_ADMISSION_LABELS_V1).map(
            ([value, label]) => ({
              value,
              label,
              exclusive: value === "none",
              visibility:
                value === "none"
                  ? undefined
                  : ({
                      op: "eq",
                      field: "infectionGroup",
                      value: "general",
                    } as const),
            }),
          ),
          ...Object.entries(INFECTIOUS_RESPIRATORY_ADMISSION_LABELS_V1)
            .filter(([value]) => value !== "none")
            .map(([value, label]) => ({
              value,
              label,
              visibility: {
                op: "in" as const,
                field: "infectionGroup",
                values: ["flu_orvi_vp", "covid"],
              },
            })),
        ],
      },
    ),
    question(
      "transportable",
      "Транспортабельность",
      "boolean",
      "conditional",
      undefined,
      {
        helpText:
          "Позволяет ли состояние выполнить прямую транспортировку в областной инфекционный стационар?",
        visibility: {
          op: "all",
          conditions: [
            { op: "eq", field: "infectionGroup", value: "general" },
            { op: "includes", field: "lifeThreats", value: "none" },
            { op: "includes", field: "admissionCriteria", value: "severe" },
          ],
        },
        options: [
          { value: true, label: "Да" },
          { value: false, label: "Нет" },
        ],
      },
    ),
  ],
  branches: [
    branch("life_threat", "Жизнеугрожающее инфекционное состояние", 10, "Отмечена хотя бы одна жизнеугроза.", "Согласованная ОАРИТ, после стабилизации — профильная эвакуация.", [INFECTIOUS_REGIONAL.id, INFECTIOUS_FEDERAL.id], ["INF-001"]),
    branch("outpatient", "Амбулаторное наблюдение", 20, "Выбран вариант отсутствия показаний к стационару.", "Территориальное амбулаторное наблюдение.", [INFECTIOUS_REGIONAL.id, INFECTIOUS_FEDERAL.id]),
    branch("seasonal", "Сезонная респираторная схема", 30, "Грипп, ОРВИ, пневмония или COVID-19 с показаниями к госпитализации.", "Стационар по сезонной территориальной схеме.", [INFECTIOUS_SEASONAL.id, INFECTIOUS_FEDERAL.id], ["INF-002", "INF-003", "INF-004"]),
    branch("severe_transportable", "Тяжёлое транспортабельное течение", 40, "Тяжёлое течение и пациент транспортабелен.", "Прямой маршрут в НОИБ.", [INFECTIOUS_REGIONAL.id, INFECTIOUS_FEDERAL.id], ["INF-004"]),
    branch("severe_nontransportable", "Тяжёлое нетранспортабельное течение", 50, "Тяжёлое течение и пациент нетранспортабелен.", "Стабилизация в согласованной ОАРИТ, затем НОИБ.", [INFECTIOUS_REGIONAL.id, INFECTIOUS_FEDERAL.id], ["INF-001", "INF-004"]),
    branch("territorial_inpatient", "Территориальный инфекционный стационар", 60, "Есть показания к госпитализации без тяжёлого течения.", "Стационар по территориальной группе.", [INFECTIOUS_REGIONAL.id, INFECTIOUS_FEDERAL.id], ["INF-004"]),
  ],
  sources: [INFECTIOUS_REGIONAL, INFECTIOUS_SEASONAL, INFECTIOUS_FEDERAL],
  blockingCuratorQuestionIds: ["INF-001", "INF-002", "INF-003", "INF-004"],
  execution: {
    kind: "rules_v1",
    ruleSetId: "infectious.v1",
  },
} satisfies RoutingProfileContentDocument;

const ROAD_SOURCE = regionalSource(
  "novgorod-1360-d",
  "Приказ Министерства здравоохранения Новгородской области от 21.11.2023 № 1360-Д",
);
const ROAD_RELATED_SOURCE = regionalSource(
  "novgorod-1359-d",
  "Связанный приказ Министерства здравоохранения Новгородской области от 21.11.2023 № 1359-Д",
);

export const roadAccidentRoutingContent = {
  schemaVersion: 1,
  contentVersion: "0.3.0-draft.1",
  status: "draft",
  profileId: "road_accident",
  audience: "all",
  updatedAt: UPDATED_AT,
  changeSummary: "Фиксация схем М-10, М-11 и муниципальных территорий.",
  officialSourcesOnly: true,
  questions: [
    question("locationKind", "Место ДТП", "single_choice", "always", "road-location-kind", {
      options: [
        { value: "territory", label: "Муниципальная территория или другая дорога" },
        { value: "m10", label: "Федеральная дорога М-10 «Россия»" },
        { value: "m11", label: "Федеральная дорога М-11 «Нева»" },
      ],
    }),
    question("territory", "Муниципальная территория", "single_choice", "conditional", "novgorod-territories", {
      visibility: { op: "eq", field: "locationKind", value: "territory" },
      options: ROAD_ACCIDENT_TERRITORIES_V1.map(({ name }) => ({ value: name, label: name })),
    }),
    question("m10Zone", "Зона трассы М-10", "single_choice", "conditional", "m10-zones", {
      visibility: { op: "eq", field: "locationKind", value: "m10" },
      options: [
        { value: "valdai_kresttsy", label: "Валдайский район и Крестецкий район до н. п. Зайцево" },
        { value: "zaytsevo_novgorod_chudovo", label: "От н. п. Зайцево через Новгородский и Чудовский районы" },
      ],
    }),
    question("m11Responder", "Подразделение, обслуживающее М-11", "single_choice", "conditional", "m11-responders", {
      visibility: { op: "eq", field: "locationKind", value: "m11" },
      options: Object.entries(ROAD_ACCIDENT_M11_RESPONDER_LABELS_V1).map(([value, label]) => ({ value, label })),
    }),
    question("m11Zone", "Километровая зона М-11", "single_choice", "conditional", "m11-zones", {
      visibility: {
        op: "all",
        conditions: [
          { op: "eq", field: "locationKind", value: "m11" },
          { op: "present", field: "m11Responder" },
        ],
      },
      options: Object.entries(ROAD_ACCIDENT_M11_ZONES_V1).flatMap(([responder, zones]) =>
        zones.map((zone) => ({
          value: zone.value,
          label: zone.label,
          visibility: { op: "eq" as const, field: "m11Responder", value: responder },
        })),
      ),
    }),
    question("ageGroup", "Возрастная группа", "single_choice", "always", "road-age-groups", {
      options: Object.entries(ROAD_ACCIDENT_AGE_LABELS_V1).map(([value, label]) => ({ value, label })),
    }),
    question("injuryCriterion", "Ведущий критерий маршрутизации", "single_choice", "always", "road-injury-criteria", {
      helpText: "Выберите наиболее тяжёлый или наиболее срочный из выявленных критериев.",
      options: Object.entries(ROAD_ACCIDENT_INJURY_LABELS_V1).map(([value, label]) => ({ value, label })),
    }),
  ],
  branches: [
    branch("m11", "Маршрут по специальной таблице для М-11 «Нева»", 10, "Выбраны М-11, обслуживающее подразделение, километровая зона, возраст и критерий травмы.", "Травмоцентр по таблице М-11.", [ROAD_SOURCE.id, ROAD_RELATED_SOURCE.id], ["ДТП-001", "ДТП-003", "ДТП-005"]),
    branch("m10", "Маршрут по зоне ответственности М-10 «Россия»", 20, "Выбраны М-10, дорожная зона, возраст и критерий травмы.", "Травмоцентр по таблице М-10.", [ROAD_SOURCE.id, ROAD_RELATED_SOURCE.id], ["ДТП-002", "ДТП-003", "ДТП-005"]),
    branch("territory_level_three_life_saving", "Этапный маршрут через травмоцентр III уровня", 30, "Территория с травмоцентром III уровня и нужна операция в течение 10–20 минут.", "Первый этап — травмоцентр III уровня, затем центр II уровня.", [ROAD_SOURCE.id, ROAD_RELATED_SOURCE.id], ["ДТП-002", "ДТП-003"]),
    branch("territory_level_three_stable_limb", "Стабильная травма конечности через центр III уровня", 40, "Территория с травмоцентром III уровня и стабильная изолированная травма конечности.", "Первый этап — травмоцентр III уровня, затем при показаниях центр II уровня.", [ROAD_SOURCE.id, ROAD_RELATED_SOURCE.id], ["ДТП-003", "ДТП-005"]),
    branch("territory_life_saving_without_level_three", "Жизнеспасающая помощь без закреплённого центра III уровня", 50, "Для территории не закреплён отдельный травмоцентр III уровня.", "Закреплённый центр II уровня с обязательным оперативным согласованием.", [ROAD_SOURCE.id, ROAD_RELATED_SOURCE.id], ["ДТП-002", "ДТП-003"]),
    branch("territory_child_high_risk", "Прямая детская маршрутизация в травмоцентр I уровня", 60, "Ребёнок 0–15 лет с тяжёлой или специализированной травмой.", "Областная детская клиническая больница.", [ROAD_SOURCE.id, ROAD_RELATED_SOURCE.id], ["ДТП-005"]),
    branch("territory_valdai_teen_high_risk", "Высокий риск у подростка в Валдайской зоне", 70, "Подросток 16–17 лет с тяжёлой травмой в Валдайской зоне.", "Маршрут с учётом возрастного ограничения Валдайского ММЦ.", [ROAD_SOURCE.id, ROAD_RELATED_SOURCE.id], ["ДТП-001", "ДТП-005"]),
    branch("territory_non_child_high_risk", "Тяжёлая травма подростка или взрослого", 80, "Тяжёлая или специализированная травма у пациента старше 15 лет.", "Центр II уровня с возможной эвакуацией в центр I уровня.", [ROAD_SOURCE.id, ROAD_RELATED_SOURCE.id], ["ДТП-003", "ДТП-005"]),
    branch("territory_other", "Иная территориальная травма", 90, "Другая травма без шока либо стабильная травма конечности без отдельного этапа III уровня.", "Закреплённый травмоцентр II уровня.", [ROAD_SOURCE.id, ROAD_RELATED_SOURCE.id], ["ДТП-003", "ДТП-005"]),
  ],
  sources: [ROAD_SOURCE, ROAD_RELATED_SOURCE],
  blockingCuratorQuestionIds: ["ДТП-001", "ДТП-002", "ДТП-003", "ДТП-004", "ДТП-005"],
  execution: {
    kind: "rules_v1",
    ruleSetId: "road-accident.v1",
  },
} satisfies RoutingProfileContentDocument;

export const routingContentDocuments = [
  obstetricsRoutingContent,
  oncologyRoutingContent,
  bskRoutingContent,
  dermatologyRoutingContent,
  infectiousRoutingContent,
  roadAccidentRoutingContent,
] as const;
