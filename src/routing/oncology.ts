import type { RoutingProfileDefinition } from "./types.js";
import { oncologyRoutingContent } from "./content-manifests.js";
import {
  ONCOLOGY_GENERAL_EMERGENCY_SIGNS_V1,
  ONCOLOGY_PALLIATIVE_SYMPTOM_SIGNS_V1,
  ONCOLOGY_RULE_SET_V1,
  ONCOLOGY_SIGN_LABELS_V1,
  ONCOLOGY_SURGICAL_SYNDROME_SIGNS_V1,
  ONCOLOGY_TERRITORY_OPTIONS_V1,
} from "./oncology-rules-v1.js";
import { evaluateRoutingRuleSetV1 } from "./rules-v1.js";

/**
 * MVP Wizard: Маршрутизация СМП (онкология) по текущему местоположению пациента.
 * Важно: логика основана на синдромах/признаках, доступных бригаде СМП.
 */

type TerritoryGroup = "novgorod" | "staraya_russa" | "borovichi" | "valdai" | "unknown";
export type OncologyStatus = "confirmed_known" | "suspected_only" | "unknown";

type RouteAfterAssessment =
  | "plan_onco_referral"
  | "vascular_cardiac"
  | "urgent_oncosurgery_known_cancer"
  | "urgent_surgical_syndrome_unclear"
  | "urgent_general_hospital"
  | "palliative"
  | "medical_transport_non_emergency"
  | "no_hospitalization";

export type LeadingSign =
  // базовые признаки неотложки
  | "altered_consciousness"
  | "respiratory_failure"
  | "circulatory_disorder"
  | "active_bleeding"
  | "massive_or_uncontrolled_bleeding"
  | "acute_pain_emergency"
  // сосудистая/кардиальная катастрофа
  | "mi_or_stroke_suspected"
  // синдромы, потенциально требующие хирургического/инвазивного стационара
  | "upper_airway_obstruction"
  | "intestinal_obstruction_suspected"
  | "severe_dysphagia_or_unable_to_feed"
  | "tense_ascites"
  | "pleural_effusion_with_dyspnea"
  | "obstructive_jaundice_suspected"
  | "dvt_suspected"
  | "stoma_complication"
  // паллиативные симптомы
  | "uncontrolled_cancer_pain"
  // «прочее»
  | "other_known_cancer_emergency";

export type PalliativeFormat = "outpatient" | "inpatient" | "nursing_care";

type EMSProvider = {
  id: string;
  name: string;
  station: string;
  address: string;
  notes?: string;
};

type Facility = {
  name: string;
  address: string;
  notes?: string;
};

export type RoutingResult = {
  ems: EMSProvider;
  route: RouteAfterAssessment;
  routeTitle: string;
  target: string;
  transport: string;
  callouts: string[];
  uncertainties?: string[];
  sources: string[];
  // справочный блок по территории
  locationOncoInfo: string;
  locationPrimaryHospital: Facility;
};

export type FormState = {
  territory?: string;
  oncologyStatus?: OncologyStatus;
  medicalTransportNeeded?: boolean;
  palliativeProfileKnown?: boolean;
  palliativeFormat?: PalliativeFormat;
  docsAvailable?: boolean;
  leadingSigns: LeadingSign[];
};

const EMS = {
  NOVGOROD: {
    id: "novgorod",
    name: "ГОБУЗ «Новгородская станция скорой медицинской помощи»",
    station: "Новгородская подстанция СМП",
    address: "г. Великий Новгород, ул. Обороны, д. 24",
  } as EMSProvider,
  STARAYA_RUSSA: {
    id: "staraya_russa",
    name: "ГОБУЗ «Новгородская станция скорой медицинской помощи»",
    station: "Старорусская подстанция СМП",
    address: "Новгородская область, г. Старая Русса, ул. Некрасова, д. 27",
  } as EMSProvider,
  BOROVICHI: {
    id: "borovichi",
    name: "ГОБУЗ «Новгородская станция скорой медицинской помощи»",
    station: "Боровичская подстанция СМП",
    address: "Новгородская область, г. Боровичи, ул. Дзержинского, д. 45",
  } as EMSProvider,
  VALDAI: {
    id: "valdai",
    name: "ФГБУ СЗОНКЦ им. Л.Г. Соколова ФМБА России",
    station: "Валдайский контур СМП",
    address: "Новгородская область, г. Валдай, ул. Песчаная, д. 16",
    notes: "По согласованию",
  } as EMSProvider,
  UNKNOWN: {
    id: "unknown",
    name: "Территория не распознана",
    station: "Нужна ручная проверка",
    address: "—",
    notes: "Проверьте муниципалитет вручную",
  } as EMSProvider,
};

const TERRITORIES_NOVGOROD = [
  "Великий Новгород",
  "Новгородский",
  "Батецкий",
  "Крестецкий",
  "Маловишерский",
  "Солецкий",
  "Чудовский",
  "Шимский",
];

const TERRITORIES_STARAYA_RUSSA = [
  "Старая Русса",
  "Старорусский",
  "Волотовский",
  "Демянский",
  "Марёвский",
  "Поддорский",
  "Холмский",
  "Парфинский",
];

const TERRITORIES_BOROVICHI = [
  "Боровичи",
  "Боровичский",
  "Мошенской",
  "Окуловский",
  "Пестовский",
  "Любытинский",
  "Хвойнинский",
];

const TERRITORIES_VALDAI = ["Валдайский"];

const LEGACY_GENERAL_EMERGENCY_SIGNS: LeadingSign[] = [
  "altered_consciousness",
  "respiratory_failure",
  "circulatory_disorder",
  "active_bleeding",
  "massive_or_uncontrolled_bleeding",
  "acute_pain_emergency",
];

const LEGACY_SURGICAL_SYNDROME_SIGNS: LeadingSign[] = [
  "upper_airway_obstruction",
  "intestinal_obstruction_suspected",
  "severe_dysphagia_or_unable_to_feed",
  "tense_ascites",
  "pleural_effusion_with_dyspnea",
  "obstructive_jaundice_suspected",
  "dvt_suspected",
  "stoma_complication",
  // массивное/неконтролируемое кровотечение часто требует хирургического/интервенционного ресурса
  "massive_or_uncontrolled_bleeding",
];

const LEGACY_PALLIATIVE_SYMPTOM_SIGNS: LeadingSign[] = [
  "uncontrolled_cancer_pain",
];

export const TERRITORY_OPTIONS = ONCOLOGY_TERRITORY_OPTIONS_V1;
export const GENERAL_EMERGENCY_SIGNS: readonly LeadingSign[] =
  ONCOLOGY_GENERAL_EMERGENCY_SIGNS_V1;
export const SURGICAL_SYNDROME_SIGNS: readonly LeadingSign[] =
  ONCOLOGY_SURGICAL_SYNDROME_SIGNS_V1;
export const PALLIATIVE_SYMPTOM_SIGNS: readonly LeadingSign[] =
  ONCOLOGY_PALLIATIVE_SYMPTOM_SIGNS_V1;

// Опорный стационар по территории (как точка «куда везти» по текущему местоположению).
// Примечание: для ОНМК/ОКС/точных профилей могут действовать отдельные приказы — здесь даём базовую точку доставки.
const PRIMARY_HOSPITAL_BY_GROUP: Record<TerritoryGroup, Facility> = {
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
};

// «Онкоконтур по текущему местоположению» — справочная подсказка.
// Это НЕ прикрепление; это ближайшая/опорная онкологическая точка для территории.
const ONCO_INFO_BY_TERRITORY: Record<string, string> = {
  "Великий Новгород": "ЦАОП ГОБУЗ «ЦГКБ» / при необходимости — ГОБУЗ «ОКОД»",
  "Новгородский": "ПОК ГОБУЗ «Новгородская ЦРБ» (Трубичино) / при необходимости — ГОБУЗ «ОКОД»",
  "Батецкий": "ПОК ГОБУЗ «Новгородская ЦРБ» (Трубичино) / при необходимости — ГОБУЗ «ОКОД»",
  "Шимский": "ПОК ГОБУЗ «Шимская ЦРБ» / при необходимости — ГОБУЗ «ОКОД»",
  "Солецкий": "ПОК ГОБУЗ «Солецкая ЦРБ» / при необходимости — ГОБУЗ «ОКОД»",
  "Чудовский": "ПОК ГОБУЗ «Чудовская ЦРБ» / при необходимости — ГОБУЗ «ОКОД»",
  "Маловишерский": "Новгородский контур (по скринам нужна ручная детализация конкретной точки входа)",

  "Боровичи": "ЦАОП ГОБУЗ «Боровичская ЦРБ»",
  "Боровичский": "ЦАОП ГОБУЗ «Боровичская ЦРБ»",
  "Мошенской": "Боровичский контур: ЦАОП Боровичской ЦРБ / Мошенская больница",
  "Любытинский": "Боровичский контур: ЦАОП Боровичской ЦРБ",
  "Пестовский": "Боровичский контур: ЦАОП Боровичской ЦРБ / Пестовская ЦРБ",
  "Хвойнинский": "Боровичский контур: ЦАОП Боровичской ЦРБ / Хвойнинская ЦРБ",
  "Окуловский": "Окуловка: ПОК Окуловской ЦРБ + пересечения с Валдайским ММЦ (возможны варианты)",

  "Старая Русса": "ЦАОП ГОБУЗ «Старорусская ЦРБ»",
  "Старорусский": "ЦАОП ГОБУЗ «Старорусская ЦРБ»",
  "Волотовский": "Старорусский контур: ЦАОП Старорусской ЦРБ / Волотовский филиал",
  "Парфинский": "Старорусский контур: ЦАОП Старорусской ЦРБ / Парфинский филиал",
  "Поддорский": "Старорусский контур: ЦАОП Старорусской ЦРБ / Поддорская ЦРБ",
  "Холмский": "Старорусский контур: ЦАОП Старорусской ЦРБ / Холмский филиал",
  "Демянский": "Демянск: ПОК Демянской ЦРБ + пересечения с Валдайским ММЦ",
  "Марёвский": "Марёво: ПОК Марёвской ЦРБ + пересечения с Валдайским ММЦ",

  "Валдайский": "Валдайский ММЦ ФГБУ СЗОНКЦ им. Л.Г. Соколова ФМБА России",
  "Крестецкий": "Крестцы: пересечения с Валдайским ММЦ (возможны варианты)",
};

function groupOfTerritory(t?: string): TerritoryGroup {
  if (!t) return "unknown";
  if (TERRITORIES_NOVGOROD.includes(t)) return "novgorod";
  if (TERRITORIES_STARAYA_RUSSA.includes(t)) return "staraya_russa";
  if (TERRITORIES_BOROVICHI.includes(t)) return "borovichi";
  if (TERRITORIES_VALDAI.includes(t)) return "valdai";
  return "unknown";
}

function emsByTerritory(t?: string): EMSProvider {
  const g = groupOfTerritory(t);
  if (g === "novgorod") return EMS.NOVGOROD;
  if (g === "staraya_russa") return EMS.STARAYA_RUSSA;
  if (g === "borovichi") return EMS.BOROVICHI;
  if (g === "valdai") return EMS.VALDAI;
  return EMS.UNKNOWN;
}

function hasAny(signs: LeadingSign[], list: readonly LeadingSign[]) {
  return list.some((x) => signs.includes(x));
}

function oncoInfoByTerritory(t?: string): string {
  if (!t) return "Не определено";
  return ONCO_INFO_BY_TERRITORY[t] ?? "Нужна ручная проверка по таблице территориального закрепления";
}

function primaryHospitalByTerritory(t?: string): Facility {
  const g = groupOfTerritory(t);
  return PRIMARY_HOSPITAL_BY_GROUP[g];
}

function isOverlapTerritory(t?: string): boolean {
  if (!t) return false;
  return ["Крестецкий", "Демянский", "Марёвский", "Окуловский", "Маловишерский"].includes(t);
}

function palliativeTarget(
  tg: TerritoryGroup,
  territory?: string,
  format?: PalliativeFormat
): { title: string; uncertainties: string[] } {
  const common = [
    "Точный выбор паллиативной МО в приказе часто привязан к направляющей медорганизации/филиалу. Без неё выбор может быть приблизительным.",
    "Если нужна точность: добавьте поле «направляющая МО/филиал» и выберите по таблице паллиативной сети.",
  ];

  if (!format) {
    return {
      title: "Подключить паллиативный контур; уточните формат (амбулаторно / стационар / сестринский уход)",
      uncertainties: common,
    };
  }

  if (format === "outpatient") {
    if (tg === "borovichi") return { title: "Амбулаторная паллиативная помощь: контур Боровичской ЦРБ", uncertainties: common };
    if (tg === "staraya_russa") return { title: "Амбулаторная паллиативная помощь: контур Старорусской ЦРБ", uncertainties: common };
    if (tg === "novgorod") return { title: "Амбулаторная паллиативная помощь: Новгородская ЦРБ / ЦГКБ / ОКОД", uncertainties: common };
    if (tg === "valdai")
      return {
        title: "Амбулаторная паллиативная помощь: Валдайский контур (по согласованию/вариантам)",
        uncertainties: [...common, "По Валдайскому контуру возможны согласовательные маршруты."],
      };
  }

  if (format === "inpatient") {
    if (tg === "novgorod")
      return {
        title: "Стационарная паллиативная помощь: ОКОД / Пролетарский филиал НЦРБ / Батецкий филиал НЦРБ",
        uncertainties: common,
      };
    if (tg === "borovichi") return { title: "Стационарная паллиативная помощь: Окуловская ЦРБ / Боровичский контур", uncertainties: common };
    if (tg === "staraya_russa") return { title: "Стационарная паллиативная помощь: Старорусский / Поддорский / Холмский контур", uncertainties: common };
    if (tg === "valdai") return { title: "Стационарная паллиативная помощь: уточнить по таблице (варианты)", uncertainties: common };
  }

  if (format === "nursing_care") {
    if (territory === "Поддорский" || territory === "Холмский" || territory === "Марёвский") {
      return { title: "Койки сестринского ухода: Поддорская ЦРБ / Холмский филиал / Марёвская ЦРБ", uncertainties: common };
    }
    return { title: "Койки сестринского ухода: уточнить по таблице паллиативной сети", uncertainties: common };
  }

  return { title: "Паллиативный контур: нужен ручной выбор по таблице", uncertainties: common };
}

function deriveRouteAfterAssessment(s: FormState): RouteAfterAssessment {
  const hasGeneralEmergency = hasAny(
    s.leadingSigns,
    LEGACY_GENERAL_EMERGENCY_SIGNS,
  );
  const hasSurgicalSyndrome = hasAny(
    s.leadingSigns,
    LEGACY_SURGICAL_SYNDROME_SIGNS,
  );
  const hasMiStroke = s.leadingSigns.includes("mi_or_stroke_suspected");
  const hasPalliativeSymptoms = hasAny(
    s.leadingSigns,
    LEGACY_PALLIATIVE_SYMPTOM_SIGNS,
  );
  const hasOtherKnownCancerEmergency = s.leadingSigns.includes("other_known_cancer_emergency") && s.oncologyStatus === "confirmed_known";

  if (hasMiStroke) return "vascular_cardiac";

  if (hasSurgicalSyndrome && s.oncologyStatus === "confirmed_known") {
    return "urgent_oncosurgery_known_cancer";
  }

  if (hasSurgicalSyndrome) {
    return "urgent_surgical_syndrome_unclear";
  }

  if (hasGeneralEmergency || hasOtherKnownCancerEmergency) {
    return "urgent_general_hospital";
  }

  if (s.palliativeProfileKnown && (hasPalliativeSymptoms || !!s.medicalTransportNeeded || !!s.palliativeFormat)) {
    return "palliative";
  }

  if (s.oncologyStatus === "suspected_only" && !s.medicalTransportNeeded) {
    return "plan_onco_referral";
  }

  if (s.medicalTransportNeeded) {
    return "medical_transport_non_emergency";
  }

  if (s.palliativeProfileKnown) {
    return "palliative";
  }

  return "no_hospitalization";
}

export function evalRoutingLegacy(s: FormState): RoutingResult {
  const ems = emsByTerritory(s.territory);
  const tg = groupOfTerritory(s.territory);
  const primaryHospital = primaryHospitalByTerritory(s.territory);
  const route = deriveRouteAfterAssessment(s);
  const locationOncoInfo = oncoInfoByTerritory(s.territory);

  const overlap = isOverlapTerritory(s.territory);

  if (route === "plan_onco_referral") {
    return {
      ems,
      route,
      routeTitle: "Подозрение на ЗНО без признаков неотложности",
      target: `Передать в онкоконтур территории: ${locationOncoInfo}`,
      transport: "Экстренная транспортировка не показана",
      callouts: [
        "Есть только подозрение на ЗНО, но нет признаков экстренного/неотложного состояния.",
        "Бригада СМП не подменяет поликлинический диагностический контур.",
      ],
      uncertainties: overlap
        ? ["Для территории есть пересечение опорных точек; при сомнениях уточните, куда ближе/доступнее."]
        : undefined,
      sources: [
        "Порядок маршрутизации при подозрении на ЗНО: направление в ПОК/ЦАОП в течение 3 рабочих дней (плановый контур).",
        "Таблица территориального закрепления ЦАОП/ПОК.",
      ],
      locationOncoInfo,
      locationPrimaryHospital: primaryHospital,
    };
  }

  if (route === "vascular_cardiac") {
    return {
      ems,
      route,
      routeTitle: "Подозрение на инфаркт / ОНМК (приоритет сосудистого/кардиологического профиля)",
      target: `Доставить в опорный стационар территории: ${primaryHospital.name}. Далее — по сосудистому/кардиологическому маршруту.`,
      transport: `Экстренная транспортировка бригадой СМП → ${primaryHospital.name} (${primaryHospital.address})`,
      callouts: [
        "Онкологический статус не отменяет профильный сосудистый/кардиологический маршрут.",
        "В данном MVP точная больница ПСО/РСЦ не зашита отдельной матрицей; базовая точка доставки — опорный стационар территории.",
      ],
      uncertainties: ["Для 100% точности нужна отдельная региональная матрица маршрутизации ОНМК/ОКС (РСЦ/ПСО/кардио)."],
      sources: [
        "Раздел приказа о неотложных состояниях: при инфаркте/ОНМК эвакуация в профильные сосудистые/кардиологические стационары.",
        "Территориальное закрепление СМП.",
      ],
      locationOncoInfo,
      locationPrimaryHospital: primaryHospital,
    };
  }

  if (route === "urgent_oncosurgery_known_cancer") {
    return {
      ems,
      route,
      routeTitle: "Известное ЗНО + срочный хирургический/инвазивный синдром",
      target: `Доставить в опорный стационар территории (хирургический профиль): ${primaryHospital.name}`,
      transport: `Транспортировка бригадой СМП → ${primaryHospital.name} (${primaryHospital.address})`,
      callouts: [
        "СМП фиксирует синдром (обструкция/непроходимость/асцит/выпот/желтуха/ТГВ/кровотечение и т.д.), а конкретное вмешательство решает принимающее ЛПУ.",
        "После стабилизации возможна дальнейшая маршрутизация в онкоконтур территории.",
      ],
      uncertainties: overlap
        ? ["Для территории возможны варианты опорных точек; при сомнениях уточните ближайшую/дежурную хирургическую площадку."]
        : undefined,
      sources: [
        "Перечень неотложных состояний у пациента с установленным ЗНО: эвакуация в стационар с хирургическими отделениями.",
        "Территориальная сеть опорных медорганизаций (ЦАОП/ЦРБ/ММЦ).",
      ],
      locationOncoInfo,
      locationPrimaryHospital: primaryHospital,
    };
  }

  if (route === "urgent_surgical_syndrome_unclear") {
    return {
      ems,
      route,
      routeTitle: "Срочный хирургический/инвазивный синдром при подозрении/неясном онкостатусе",
      target: `Доставить в опорный стационар территории (хирургический профиль): ${primaryHospital.name}`,
      transport: `Транспортировка бригадой СМП → ${primaryHospital.address}`,
      callouts: [
        "Синдром требует стационарного решения независимо от того, подтверждён ли диагноз ЗНО.",
        "Приоритет — устранить непосредственную угрозу и выполнить ЛПУ-уровень уточнения диагноза/тактики.",
      ],
      uncertainties: overlap
        ? ["Для территории возможны варианты опорных точек; при сомнениях уточните ближайшую/дежурную хирургическую площадку."]
        : undefined,
      sources: [
        "Раздел о неотложных состояниях: доставка в стационар, оказывающий специализированную помощь в хирургических отделениях.",
      ],
      locationOncoInfo,
      locationPrimaryHospital: primaryHospital,
    };
  }

  if (route === "urgent_general_hospital") {
    return {
      ems,
      route,
      routeTitle: "Общая неотложная госпитализация",
      target: `Доставить в опорный стационар территории: ${primaryHospital.name}`,
      transport: `Транспортировка бригадой СМП → ${primaryHospital.address}`,
      callouts: [
        "Есть признаки неотложного состояния: сознание/дыхание/кровообращение/кровотечение/острая боль.",
        "В MVP точка доставки фиксируется как опорный стационар территории; внутри стационара профиль определяется по клинической картине.",
      ],
      uncertainties: overlap
        ? ["Для территории возможны варианты опорных точек; при сомнениях уточните ближайший дежурный стационар."]
        : undefined,
      sources: [
        "Пункты приказа о поводах для вызова СМП и об оказании помощи при неотложных состояниях.",
        "Территориальное закрепление СМП.",
      ],
      locationOncoInfo,
      locationPrimaryHospital: primaryHospital,
    };
  }

  if (route === "palliative") {
    const pall = palliativeTarget(tg, s.territory, s.palliativeFormat);
    const addUncert = !s.docsAvailable
      ? [
          "Паллиативный профиль отмечен без документов: допустимо как рабочая гипотеза бригады, но точный паллиативный маршрут может потребовать подтверждения/оформления.",
        ]
      : [];

    return {
      ems,
      route,
      routeTitle: "Паллиативный маршрут",
      target: pall.title,
      transport:
        s.palliativeFormat === "outpatient"
          ? "Экстренная госпитализация не основная цель; подключение паллиативной службы/выездной бригады"
          : s.medicalTransportNeeded
          ? `Медицинская транспортировка → ${primaryHospital.name} (уточнить паллиативную точку по таблице)`
          : "Формат определяется клинической ситуацией (амбулаторно/стационар/сестринский уход)",
      callouts: [
        "Паллиативная ветка вторична по отношению к сосудистой/кардиальной и экстренной хирургической/общей неотложной веткам.",
        "Если есть некупируемая онкоболь без иной угрозы жизни — предпочтителен паллиативный/симптоматический контур.",
      ],
      uncertainties: [...pall.uncertainties, ...addUncert],
      sources: ["Приложения о паллиативной помощи и территориальном закреплении паллиативной сети."],
      locationOncoInfo,
      locationPrimaryHospital: primaryHospital,
    };
  }

  if (route === "medical_transport_non_emergency") {
    return {
      ems,
      route,
      routeTitle: "Медицинская транспортировка без признаков критической неотложности",
      target: `Точка доставки по текущему местоположению: ${primaryHospital.name}`,
      transport: `Медицинская транспортировка бригадой СМП → ${primaryHospital.name} (${primaryHospital.address})`,
      callouts: [
        "Пациент стабилен, но сам не доедет или требуется доставка в ЛПУ для решения вопроса.",
        "В MVP точка доставки фиксируется как опорный стационар территории; далее — решение внутри ЛПУ.",
      ],
      uncertainties: overlap
        ? ["Для территории возможны варианты опорных точек; при сомнениях уточните ближайший дежурный стационар."]
        : undefined,
      sources: ["Организационная логика СМП: перевозка пациента туда, где вопрос должен быть решён."],
      locationOncoInfo,
      locationPrimaryHospital: primaryHospital,
    };
  }

  return {
    ems,
    route,
    routeTitle: "Без госпитализации",
    target: `Оставление на месте / рекомендации. Для онко-контура территории: ${locationOncoInfo}`,
    transport: "Госпитализация и медтранспорт не требуются по текущей оценке",
    callouts: [
      "Нет признаков экстренного/неотложного состояния.",
      "Нет синдрома, требующего хирургического/инвазивного стационара.",
      "Нет отдельной цели медицинской транспортировки.",
    ],
    uncertainties: overlap
      ? ["Для территории есть пересечение опорных точек; при необходимости уточните ближайшую/доступную точку онко-контура."]
      : undefined,
    sources: ["Логическое завершение контакта СМП."],
    locationOncoInfo,
    locationPrimaryHospital: primaryHospital,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isEmsProvider(value: unknown): value is EMSProvider {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.station === "string" &&
    typeof value.address === "string" &&
    (value.notes === undefined || typeof value.notes === "string")
  );
}

function isFacility(value: unknown): value is Facility {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.address === "string" &&
    (value.notes === undefined || typeof value.notes === "string")
  );
}

function isRoute(value: unknown): value is RouteAfterAssessment {
  return (
    value === "plan_onco_referral" ||
    value === "vascular_cardiac" ||
    value === "urgent_oncosurgery_known_cancer" ||
    value === "urgent_surgical_syndrome_unclear" ||
    value === "urgent_general_hospital" ||
    value === "palliative" ||
    value === "medical_transport_non_emergency" ||
    value === "no_hospitalization"
  );
}

function routingResultFromRules(value: unknown): RoutingResult {
  if (
    !isRecord(value) ||
    !isEmsProvider(value.ems) ||
    !isRoute(value.route) ||
    typeof value.routeTitle !== "string" ||
    typeof value.target !== "string" ||
    typeof value.transport !== "string" ||
    !isStringArray(value.callouts) ||
    (value.uncertainties !== undefined &&
      !isStringArray(value.uncertainties)) ||
    !isStringArray(value.sources) ||
    typeof value.locationOncoInfo !== "string" ||
    !isFacility(value.locationPrimaryHospital)
  ) {
    throw new Error("rules_v1 вернул некорректный результат онкологического профиля.");
  }
  return value as RoutingResult;
}

function normalizeRoutingState(state: FormState) {
  const territoryKey = !state.territory
    ? "__missing__"
    : (TERRITORY_OPTIONS as readonly string[]).includes(state.territory)
      ? state.territory
      : "__unknown__";
  return {
    ...state,
    territoryKey,
    palliativeFormatKey: state.palliativeFormat ?? "__missing__",
    medicalTransportNeededKey: state.medicalTransportNeeded ? "true" : "false",
    docsAvailableKey: state.docsAvailable ? "true" : "false",
    always: true,
  };
}

export function evalRoutingRulesV1(state: FormState): RoutingResult {
  const evaluation = evaluateRoutingRuleSetV1(
    ONCOLOGY_RULE_SET_V1,
    normalizeRoutingState(state),
  );
  if (!evaluation) {
    throw new Error("rules_v1 не выбрал обязательную онкологическую ветку.");
  }
  return routingResultFromRules(evaluation.result);
}

export function evalRouting(state: FormState): RoutingResult {
  return evalRoutingRulesV1(state);
}

export function signLabel(x: LeadingSign) {
  return ONCOLOGY_SIGN_LABELS_V1[x];
}

export function warnings(s: FormState): string[] {
  const w: string[] = [];
  if (!s.territory) w.push("Не выбрано текущее местоположение пациента.");
  if (!s.oncologyStatus) w.push("Не указан онкологический статус пациента.");

  const hasMiStroke = s.leadingSigns.includes("mi_or_stroke_suspected");
  const hasGeneralEmergency = hasAny(s.leadingSigns, GENERAL_EMERGENCY_SIGNS);
  const hasSurgical = hasAny(s.leadingSigns, SURGICAL_SYNDROME_SIGNS);

  if (isOverlapTerritory(s.territory)) {
    w.push("Для территории есть пересечение опорных точек (в таблицах встречаются варианты). При сомнениях выбирайте ближайшую/дежурную площадку.");
  }

  if (hasMiStroke && (hasGeneralEmergency || hasSurgical)) {
    w.push("Есть подозрение на ОНМК/инфаркт и другие признаки — приоритет у сосудисто/кардиальной ветки.");
  }

  if (s.palliativeProfileKnown && !s.docsAvailable) {
    w.push("Паллиативный профиль отмечен без документов — допустимо как гипотеза, но точный маршрут может потребовать подтверждения.");
  }

  if (s.oncologyStatus === "suspected_only" && hasSurgical) {
    w.push("Отмечен хирургический синдром при статусе «только подозрение на ЗНО» — это допустимо: СМП действует по синдрому.");
  }

  if (s.medicalTransportNeeded && (hasGeneralEmergency || hasSurgical || hasMiStroke)) {
    w.push("Отмечены и медтранспорт, и признаки неотложности — приоритет у неотложной ветки.");
  }

  return w;
}

export const oncologyRoutingProfile = {
  id: "oncology",
  title: "Онкология",
  description: "Территория → СМП → синдромы → итоговый маршрут",
  content: oncologyRoutingContent,
  evaluate: evalRouting,
} satisfies RoutingProfileDefinition<FormState, RoutingResult>;
