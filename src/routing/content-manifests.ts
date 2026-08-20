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
    question("scenario", "Клинический сценарий", "single_choice", "always", "obstetric-scenarios"),
    question("territory", "Территория вызова", "single_choice", "conditional", "novgorod-territories"),
    question("critical", "Критическое состояние", "boolean", "conditional"),
    question("criticalKind", "Вид критического состояния", "single_choice", "conditional", "obstetric-critical-kinds"),
    question("criticalRoute", "Профиль критического маршрута", "single_choice", "conditional", "obstetric-critical-routes"),
    question("infectionType", "Инфекционный синдром", "single_choice", "conditional", "obstetric-infections"),
    question("infectionSevere", "Тяжёлое течение инфекции", "boolean", "conditional"),
    question("infectionOver7Days", "Длительность инфекции более 7 дней", "boolean", "conditional"),
    question("trauma", "Травма", "boolean", "conditional"),
    question("traumaSevere", "Тяжёлая травма", "boolean", "conditional"),
    question("surgery", "Острая хирургическая патология", "boolean", "conditional"),
    question("surgeryLifeThreat", "Жизнеугрожающая хирургическая патология", "boolean", "conditional"),
    question("surgeryProfile", "Хирургический профиль", "single_choice", "conditional", "surgery-profiles"),
    question("extragenitalInpatient", "Тяжёлая экстрагенитальная патология", "boolean", "conditional"),
    question("pretermLabor", "Преждевременные роды", "boolean", "conditional"),
    question("canDeliverToNokpc", "Возможна доставка в НОКПЦ", "boolean", "conditional"),
    question("riskDelivery", "Группа риска родов", "single_choice", "conditional", "delivery-risk"),
    question("postpartumIssue", "Послеродовое осложнение", "single_choice", "conditional", "postpartum-issues"),
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
    question("territory", "Территория вызова", "single_choice", "always", "novgorod-territories"),
    question("branch", "Ведущий сердечно-сосудистый синдром", "single_choice", "always", "bsk-branches"),
    question("unstableVitals", "Нарушение витальных функций", "boolean", "always"),
    question("fastFace", "Асимметрия лица", "boolean", "conditional"),
    question("fastArm", "Слабость руки", "boolean", "conditional"),
    question("fastSpeech", "Нарушение речи", "boolean", "conditional"),
    question("strokeOnset", "Время начала неврологических симптомов", "single_choice", "conditional", "stroke-onset"),
    question("onsetWithin5h", "Доставка возможна в пределах пяти часов", "boolean", "conditional"),
    question("armMovement", "Удержание руки", "single_choice", "conditional", "arm-movement"),
    question("gripStrength", "Сила сжатия кисти", "single_choice", "conditional", "grip-strength"),
    question("chestPainOrEquivalent", "Боль в груди или эквивалент", "boolean", "conditional"),
    question("ecgDone", "ЭКГ выполнена", "boolean", "conditional"),
    question("stElevation", "Подъём сегмента ST", "boolean", "conditional"),
    question("pciWithin120", "ЧКВ доступно в пределах 120 минут", "boolean", "conditional"),
    question("tltContraindications", "Противопоказания к ТЛТ", "boolean", "conditional"),
    question("nsteHighRisk", "Высокий риск ОКС без подъёма ST", "boolean", "conditional"),
    question("rhythmDisorder", "Нарушение ритма", "boolean", "conditional"),
    question("conductionDisorder", "Нарушение проводимости", "boolean", "conditional"),
    question("suspectedPE", "Подозрение на ТЭЛА", "boolean", "conditional"),
    question("acuteHeartFailure", "Острая сердечная недостаточность", "boolean", "conditional"),
    question("restPain", "Боль в покое", "boolean", "conditional"),
    question("legDownAtNight", "Опускание ноги ночью", "boolean", "conditional"),
    question("trophicChanges", "Трофические изменения", "boolean", "conditional"),
    question("necrosisGangrene", "Некроз или гангрена", "boolean", "conditional"),
    question("infectionSigns", "Признаки инфекции конечности", "boolean", "conditional"),
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
    question("territory", "Территория вызова", "single_choice", "always", "novgorod-territories"),
    question("oncologyStatus", "Онкологический статус", "single_choice", "always", "oncology-status"),
    question("leadingSigns", "Ведущие синдромы", "multiple_choice", "always", "oncology-leading-signs"),
    question("medicalTransportNeeded", "Требуется медицинская перевозка", "boolean", "conditional"),
    question("palliativeProfileKnown", "Известен паллиативный профиль", "boolean", "conditional"),
    question("palliativeFormat", "Формат паллиативной помощи", "single_choice", "conditional", "palliative-format"),
    question("docsAvailable", "Медицинские документы доступны", "boolean", "optional"),
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
    question("territory", "Территория вызова", "single_choice", "always", "novgorod-territories"),
    question("condition", "Опасное состояние", "single_choice", "always", "dermatology-emergencies"),
    question("inpatientCare", "Показана стационарная помощь", "boolean", "conditional"),
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
    question("locationKind", "Место ДТП", "single_choice", "always", "road-location-kind"),
    question("territory", "Муниципальная территория", "single_choice", "conditional", "novgorod-territories"),
    question("m10Zone", "Зона трассы М-10", "single_choice", "conditional", "m10-zones"),
    question("m11Responder", "Подразделение, обслуживающее М-11", "single_choice", "conditional", "m11-responders"),
    question("m11Zone", "Километровая зона М-11", "single_choice", "conditional", "m11-zones"),
    question("ageGroup", "Возрастная группа", "single_choice", "always", "road-age-groups"),
    question("injuryCriterion", "Критерий травмы", "single_choice", "always", "road-injury-criteria"),
  ],
  branches: [
    branch("m11", "Маршрут М-11", 10, "ДТП произошло в выбранной зоне М-11.", "Травмоцентр по подразделению, километру, возрасту и тяжести.", [ROAD_SOURCE.id, ROAD_RELATED_SOURCE.id], ["ДТП-001", "ДТП-003", "ДТП-005"]),
    branch("m10_life_saving", "М-10 — жизнеспасающая операция", 20, "М-10 и требуется экстренная жизнеспасающая операция.", "Ближайший согласованный травмоцентр III уровня.", [ROAD_SOURCE.id, ROAD_RELATED_SOURCE.id], ["ДТП-002", "ДТП-003"]),
    branch("m10_other", "М-10 — иная травма", 30, "М-10 без критерия немедленной жизнеспасающей операции.", "Травмоцентр по зоне, возрасту и тяжести.", [ROAD_SOURCE.id, ROAD_RELATED_SOURCE.id], ["ДТП-003", "ДТП-005"]),
    branch("territory_life_saving", "Территория — жизнеспасающая операция", 40, "Муниципальная территория и требуется жизнеспасающая операция.", "Травмоцентр III уровня либо согласованный ближайший пункт.", [ROAD_SOURCE.id, ROAD_RELATED_SOURCE.id], ["ДТП-002", "ДТП-003"]),
    branch("territory_stable", "Территория — стабильная изолированная травма", 50, "Стабильная изолированная травма.", "Травмоцентр III уровня или закреплённый центр II уровня.", [ROAD_SOURCE.id, ROAD_RELATED_SOURCE.id], ["ДТП-003", "ДТП-005"]),
    branch("territory_child_severe", "Тяжёлая травма ребёнка", 60, "Тяжёлая травма у ребёнка.", "Прямой детский травмоцентр I уровня.", [ROAD_SOURCE.id, ROAD_RELATED_SOURCE.id], ["ДТП-005"]),
    branch("territory_adult_severe", "Тяжёлая травма взрослого", 70, "Тяжёлая травма у взрослого или подростка.", "Центр II уровня с возможным переводом в центр I уровня.", [ROAD_SOURCE.id, ROAD_RELATED_SOURCE.id], ["ДТП-001", "ДТП-003", "ДТП-005"]),
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
