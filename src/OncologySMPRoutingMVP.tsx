import React, { useMemo, useState } from "react";

/**
 * MVP Wizard: Маршрутизация СМП (онкология) по текущему местоположению пациента.
 * Важно: логика основана на синдромах/признаках, доступных бригаде СМП.
 */

type TerritoryGroup = "novgorod" | "staraya_russa" | "borovichi" | "valdai" | "unknown";
type OncologyStatus = "confirmed_known" | "suspected_only" | "unknown";

type RouteAfterAssessment =
  | "plan_onco_referral"
  | "vascular_cardiac"
  | "urgent_oncosurgery_known_cancer"
  | "urgent_surgical_syndrome_unclear"
  | "urgent_general_hospital"
  | "palliative"
  | "medical_transport_non_emergency"
  | "no_hospitalization";

type LeadingSign =
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

type PalliativeFormat = "outpatient" | "inpatient" | "nursing_care";

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

type RoutingResult = {
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

type FormState = {
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

const TERRITORY_OPTIONS = [
  ...TERRITORIES_NOVGOROD,
  ...TERRITORIES_STARAYA_RUSSA,
  ...TERRITORIES_BOROVICHI,
  ...TERRITORIES_VALDAI,
].sort((a, b) => a.localeCompare(b, "ru"));

const GENERAL_EMERGENCY_SIGNS: LeadingSign[] = [
  "altered_consciousness",
  "respiratory_failure",
  "circulatory_disorder",
  "active_bleeding",
  "massive_or_uncontrolled_bleeding",
  "acute_pain_emergency",
];

const SURGICAL_SYNDROME_SIGNS: LeadingSign[] = [
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

const PALLIATIVE_SYMPTOM_SIGNS: LeadingSign[] = ["uncontrolled_cancer_pain"];

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

function hasAny(signs: LeadingSign[], list: LeadingSign[]) {
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
  const hasGeneralEmergency = hasAny(s.leadingSigns, GENERAL_EMERGENCY_SIGNS);
  const hasSurgicalSyndrome = hasAny(s.leadingSigns, SURGICAL_SYNDROME_SIGNS);
  const hasMiStroke = s.leadingSigns.includes("mi_or_stroke_suspected");
  const hasPalliativeSymptoms = hasAny(s.leadingSigns, PALLIATIVE_SYMPTOM_SIGNS);
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

function evalRouting(s: FormState): RoutingResult {
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

function signLabel(x: LeadingSign) {
  const map: Record<LeadingSign, string> = {
    altered_consciousness: "Нарушение сознания",
    respiratory_failure: "Нарушение дыхания",
    circulatory_disorder: "Нарушение системы кровообращения",
    active_bleeding: "Активное кровотечение",
    massive_or_uncontrolled_bleeding: "Массивное / неконтролируемое кровотечение",
    acute_pain_emergency: "Острая боль как неотложный синдром",
    mi_or_stroke_suspected: "Подозрение на инфаркт / ОНМК",
    upper_airway_obstruction: "Угроза обструкции верхних дыхательных путей (возможна трахеостомия)",
    intestinal_obstruction_suspected: "Подозрение на непроходимость/обтурацию (возможна стома/декомпрессия)",
    severe_dysphagia_or_unable_to_feed: "Выраженная дисфагия/невозможность питания (возможна гастростома)",
    tense_ascites: "Напряжённый асцит (возможен лапароцентез)",
    pleural_effusion_with_dyspnea: "Плевральный выпот с одышкой (возможен торакоцентез)",
    obstructive_jaundice_suspected: "Подозрение на механическую желтуху",
    dvt_suspected: "Подозрение на тромбоз вен нижней конечности",
    stoma_complication: "Осложнение стомы/дренажа",
    uncontrolled_cancer_pain: "Некуупируемая онкоболь / симптоматическая декомпенсация",
    other_known_cancer_emergency: "Иное неотложное состояние у пациента с известным ЗНО",
  };
  return map[x];
}

function warnings(s: FormState): string[] {
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

const Button = (props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) => {
  const { variant = "primary", className = "", ...rest } = props;
  const base =
    "px-3 py-2 rounded-2xl text-sm font-medium transition border " +
    (variant === "primary"
      ? "bg-black text-white border-black hover:opacity-90"
      : "bg-white text-black border-neutral-200 hover:bg-neutral-50 disabled:opacity-50");
  return <button className={`${base} ${className}`} {...rest} />;
};

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
    <div className="text-base font-semibold mb-3">{title}</div>
    {children}
  </div>
);

function Select<T extends string>(props: {
  value?: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  placeholder?: string;
}) {
  const { value, onChange, options, placeholder = "Выберите…" } = props;
  return (
    <select
      className="w-full rounded-2xl border border-neutral-200 p-2"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value as T)}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function TogglePill(props: { active: boolean; onClick: () => void; label: string }) {
  return (
    <Button variant={props.active ? "primary" : "ghost"} onClick={props.onClick} type="button">
      {props.label}
    </Button>
  );
}

function YesNo(props: { value?: boolean; onChange: (v: boolean) => void; yesLabel?: string; noLabel?: string }) {
  const { value, onChange, yesLabel = "Да", noLabel = "Нет" } = props;
  return (
    <div className="flex gap-2">
      <Button variant={value === true ? "primary" : "ghost"} onClick={() => onChange(true)} type="button">
        {yesLabel}
      </Button>
      <Button variant={value === false ? "primary" : "ghost"} onClick={() => onChange(false)} type="button">
        {noLabel}
      </Button>
    </div>
  );
}

export default function RoutingWizardOncologySMP() {
  const [step, setStep] = useState(0);
  const [s, setS] = useState<FormState>({
    leadingSigns: [],
    medicalTransportNeeded: false,
    palliativeProfileKnown: false,
    docsAvailable: false,
  });

  const result = useMemo(() => (s.territory && s.oncologyStatus ? evalRouting(s) : null), [s]);
  const ws = warnings(s);

  const canNext = useMemo(() => {
    if (step === 0) return !!s.territory && !!s.oncologyStatus;
    return true;
  }, [step, s, s.territory, s.oncologyStatus]);

  function toggleSign(sign: LeadingSign) {
    setS((prev) => ({
      ...prev,
      leadingSigns: prev.leadingSigns.includes(sign) ? prev.leadingSigns.filter((x) => x !== sign) : [...prev.leadingSigns, sign],
    }));
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-4">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-2xl font-bold">RoutingWizard — СМП (онкология, Test)</div>
            <div className="text-sm text-neutral-600">Текущее местоположение → признаки/синдромы → точка доставки (опорный стационар)</div>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              setStep(0);
              setS({
                leadingSigns: [],
                medicalTransportNeeded: false,
                palliativeProfileKnown: false,
                docsAvailable: false,
              });
            }}
          >
            Сброс
          </Button>
        </div>

        {ws.length > 0 && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="font-semibold mb-1">Подсказки и конфликты</div>
            <ul className="list-disc ml-5 space-y-1">
              {ws.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
        )}

        {step === 0 && (
          <Card title="Шаг 1 — Текущее местоположение и базовый контекст">
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-1">Текущее местоположение пациента (округ/город)</div>
                <select
                  className="w-full rounded-2xl border border-neutral-200 p-2"
                  value={s.territory ?? ""}
                  onChange={(e) => setS((prev) => ({ ...prev, territory: e.target.value }))}
                >
                  <option value="" disabled>
                    Выберите территорию…
                  </option>
                  {TERRITORY_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-sm font-medium mb-1">Онкологический статус пациента</div>
                <Select<OncologyStatus>
                  value={s.oncologyStatus}
                  onChange={(v) => setS((prev) => ({ ...prev, oncologyStatus: v }))}
                  placeholder="Выберите статус…"
                  options={[
                    { value: "confirmed_known", label: "Установленный ЗНО известен" },
                    { value: "suspected_only", label: "Только подозрение на ЗНО" },
                    { value: "unknown", label: "Неизвестно / данных недостаточно" },
                  ]}
                />
              </div>
            </div>
          </Card>
        )}

        {step === 1 && (
          <Card title="Шаг 2 — Признаки/синдромы (доступные бригаде СМП)">
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-2">Сосудистая/кардиальная, жизненая угроза</div>
                <div className="flex flex-wrap gap-2">
                  <TogglePill
                    active={s.leadingSigns.includes("mi_or_stroke_suspected")}
                    onClick={() => toggleSign("mi_or_stroke_suspected")}
                    label={signLabel("mi_or_stroke_suspected")}
                  />
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Признаки общей неотложки</div>
                <div className="flex flex-wrap gap-2">
                  {GENERAL_EMERGENCY_SIGNS.map((sign) => (
                    <TogglePill key={sign} active={s.leadingSigns.includes(sign)} onClick={() => toggleSign(sign)} label={signLabel(sign)} />
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Синдромы, требующие хирургического/инвазивного стационара</div>
                <div className="flex flex-wrap gap-2">
                  {SURGICAL_SYNDROME_SIGNS.filter((x, i, arr) => arr.indexOf(x) === i).map((sign) => (
                    <TogglePill key={sign} active={s.leadingSigns.includes(sign)} onClick={() => toggleSign(sign)} label={signLabel(sign)} />
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Паллиативные симптомы</div>
                <div className="flex flex-wrap gap-2">
                  {PALLIATIVE_SYMPTOM_SIGNS.map((sign) => (
                    <TogglePill key={sign} active={s.leadingSigns.includes(sign)} onClick={() => toggleSign(sign)} label={signLabel(sign)} />
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Дополнительно</div>
                <div className="flex flex-wrap gap-2">
                  <TogglePill
                    active={s.leadingSigns.includes("other_known_cancer_emergency")}
                    onClick={() => toggleSign("other_known_cancer_emergency")}
                    label={signLabel("other_known_cancer_emergency")}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">Нужна медицинская транспортировка (без критической неотложности)?</div>
                  <div className="text-sm text-neutral-600">Орг. флаг: пациент стабилен, но сам не доедет / нужна доставка в ЛПУ.</div>
                </div>
                <YesNo value={s.medicalTransportNeeded} onChange={(v) => setS((prev) => ({ ...prev, medicalTransportNeeded: v }))} />
              </div>

              <div className="rounded-2xl bg-neutral-50 p-3 text-sm text-neutral-700">
                Выбранные признаки: {s.leadingSigns.length > 0 ? s.leadingSigns.map(signLabel).join(", ") : "не выбраны"}
              </div>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card title="Шаг 3 — Паллиативный профиль (если применимо)">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">Пациент известен как паллиативный / инкурабельный?</div>
                  <div className="text-sm text-neutral-600">Эта ветка вторична по отношению к ОНМК/инфаркту и экстренной хирургии.</div>
                </div>
                <YesNo value={s.palliativeProfileKnown} onChange={(v) => setS((prev) => ({ ...prev, palliativeProfileKnown: v }))} />
              </div>

              {s.palliativeProfileKnown && (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">Есть документы/выписки паллиативного статуса?</div>
                      <div className="text-sm text-neutral-600">Если нет — точный маршрут может потребовать подтверждения.</div>
                    </div>
                    <YesNo value={s.docsAvailable} onChange={(v) => setS((prev) => ({ ...prev, docsAvailable: v }))} />
                  </div>

                  <div>
                    <div className="text-sm font-medium mb-1">Формат паллиативной помощи</div>
                    <Select<PalliativeFormat>
                      value={s.palliativeFormat}
                      onChange={(v) => setS((prev) => ({ ...prev, palliativeFormat: v }))}
                      placeholder="Выберите формат…"
                      options={[
                        { value: "outpatient", label: "Амбулаторно / выездная паллиативная помощь" },
                        { value: "inpatient", label: "Паллиативный стационар" },
                        { value: "nursing_care", label: "Койки сестринского ухода" },
                      ]}
                    />
                  </div>
                </>
              )}
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card title="Результат маршрутизации">
            {!result ? (
              <div className="text-sm text-neutral-700">Недостаточно данных.</div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-neutral-200 p-3">
                    <div className="text-sm text-neutral-500">Кто обслуживает вызов</div>
                    <div className="font-semibold">{result.ems.name}</div>
                    <div>{result.ems.station}</div>
                    <div className="text-xs text-neutral-500 mt-1">Адрес подстанции/базы СМП (откуда выезжает бригада)</div>
                    <div className="text-sm text-neutral-600">{result.ems.address}</div>
                    {result.ems.notes && <div className="text-sm text-amber-700 mt-1">{result.ems.notes}</div>}
                  </div>

                  <div className="rounded-2xl border border-neutral-200 p-3">
                    <div className="text-sm text-neutral-500">Онкоконтур по текущему местоположению</div>
                    <div className="font-medium">{result.locationOncoInfo}</div>
                    <div className="text-xs text-neutral-500 mt-2">Опорный стационар: {result.locationPrimaryHospital.name}</div>
                    <div className="text-xs text-neutral-500">Адрес: {result.locationPrimaryHospital.address}</div>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 p-3">
                    <div className="text-sm text-neutral-500">Исход осмотра</div>
                    <div className="font-semibold">{result.routeTitle}</div>
                    <div className="text-sm text-neutral-700 mt-1">
                      Онкостатус: {s.oncologyStatus === "confirmed_known" ? "установленный ЗНО" : s.oncologyStatus === "suspected_only" ? "только подозрение" : "неизвестно"}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-200 p-3">
                  <div className="text-sm text-neutral-500">Куда везти</div>
                  <div className="font-medium">{result.target}</div>
                </div>

                <div className="rounded-2xl border border-neutral-200 p-3">
                  <div className="text-sm text-neutral-500">Транспортировка</div>
                  <div className="font-medium">{result.transport}</div>
                </div>

                <div className="rounded-2xl border border-neutral-200 p-3">
                  <div className="text-sm text-neutral-500">Обоснование</div>
                  <ul className="list-disc ml-5 text-sm text-neutral-800 space-y-1 mt-1">
                    {result.callouts.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>

                {result.uncertainties && result.uncertainties.length > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                    <div className="text-sm font-medium text-amber-900">Нужно уточнение</div>
                    <ul className="list-disc ml-5 text-sm text-amber-900 space-y-1 mt-1">
                      {result.uncertainties.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="rounded-2xl border border-neutral-200 p-3">
                  <div className="text-sm text-neutral-500">Источники логики</div>
                  <ul className="list-disc ml-5 text-sm text-neutral-800 space-y-1 mt-1">
                    {result.sources.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </Card>
        )}

        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep((p) => Math.max(0, p - 1))} disabled={step === 0}>
            Назад
          </Button>
          <div className="text-sm text-neutral-600">Шаг {step + 1} / 4</div>
          <Button onClick={() => setStep((p) => Math.min(3, p + 1))} disabled={!canNext || step === 3}>
            Далее
          </Button>
        </div>
      </div>
    </div>
  );
}
