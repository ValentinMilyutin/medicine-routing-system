import type { RoutingProfileDefinition } from "./types.js";
import { dermatologyRoutingContent } from "./content-manifests.js";
import {
  DERMATOLOGY_CONDITION_LABELS,
  DERMATOLOGY_RULE_SET_V1,
  DERMATOLOGY_TERRITORIES,
} from "./dermatology-rules-v1.js";
import { evaluateRoutingRuleSetV1 } from "./rules-v1.js";


export type Condition =
  | "angioedema"
  | "toxicoderma"
  | "lyell"
  | "stevens_johnson"
  | "none";

export type Facility = {
  name: string;
  role: string;
  address: string;
};

type Territory = {
  name: string;
  outpatientTarget: Facility;
};

export type FormState = {
  territory?: string;
  condition?: Condition;
  inpatientCare?: boolean;
};

export type Source = {
  label: string;
  url?: string;
};

export type RoutingResult = {
  title: string;
  target: Facility;
  urgency: string;
  transport: string;
  actions: string[];
  handoff: string[];
  sources: Source[];
  afterStabilization?: Facility;
};

export const TERRITORIES = DERMATOLOGY_TERRITORIES;
export const CONDITION_LABELS = DERMATOLOGY_CONDITION_LABELS;

const FEDERAL_ORDER_URL =
  "https://publication.pravo.gov.ru/document/0001202510280015";
const PREVIOUS_FEDERAL_ORDER_URL =
  "https://minzdrav.gov.ru/documents/9101-poryadok-okazaniya-meditsinskoy-pomoschi-po-profilyu-dermatovenerologiya-utv-prikazom-ministerstva-zdravoohraneniya-rossiyskoy-federatsii-ot-15-noyabrya-2012-g-924n";
const EMERGENCY_CARE_ORDER_URL =
  "https://minzdrav.gov.ru/ministry/61/3/stranitsa-992/prikaz-minzdrava-rossii-ot-20-06-2013-n-388n-red-ot-21-02-2020-ob-utverzhdenii-poryadka-okazaniya-skoroy-v-tom-chisle-skoroy-spetsializirovannoy-meditsinskoy-pomoschi";

const REGIONAL_ORDER: Source = {
  label:
    "Приказ Министерства здравоохранения Новгородской области от 01.02.2022 № 98-Д, приложение к приказу",
};

const LEGACY_FACILITIES = {
  nearestIcu: {
    name: "Ближайшая медицинская организация с ОАРИТ или палатой интенсивной терапии",
    role: "Региональный приказ не называет конкретную организацию: точку назначения нужно сверить по действующему оперативному маршруту СМП",
    address: "Адрес определяется после согласования доступного стационара",
  },
  nokvdOutpatient: {
    name: "ОАУЗ «Новгородский областной кожно-венерологический диспансер»",
    role: "Амбулаторный приём врача-дерматовенеролога",
    address: "Великий Новгород, ул. Дворцовая, д. 10/6",
  },
  nokvdInpatient: {
    name: "ОАУЗ «Новгородский областной кожно-венерологический диспансер»",
    role: "Профильный дерматовенерологический стационар",
    address: "Великий Новгород, ул. Большая Московская, д. 67, стр. 4",
  },
  borovichi: {
    name: "ГОБУЗ «Боровичская центральная районная больница»",
    role: "Кабинет врача-дерматовенеролога",
    address: "г. Боровичи, пл. 1 Мая, д. 2А",
  },
  starayaRussa: {
    name: "ГОБУЗ «Старорусская центральная районная больница»",
    role: "Кабинет врача-дерматовенеролога",
    address: "г. Старая Русса, ул. Гостинодворская, д. 50",
  },
  valdai: {
    name: "Валдайский многопрофильный медицинский центр ФМБА России",
    role: "Кабинет врача-дерматовенеролога",
    address: "г. Валдай, ул. Песчаная, д. 1А",
  },
  pestovo: {
    name: "ГОБУЗ «Пестовская центральная районная больница»",
    role: "Кабинет врача-дерматовенеролога",
    address: "г. Пестово, ул. Курганная, д. 18",
  },
  kresttsy: {
    name: "ГОБУЗ «Крестецкая центральная районная больница»",
    role: "Кабинет врача-дерматовенеролога",
    address: "р. п. Крестцы, ул. Гагарина, д. 2",
  },
  malayaVishera: {
    name: "ГОБУЗ «Маловишерская центральная районная больница»",
    role: "Кабинет врача-дерматовенеролога",
    address: "г. Малая Вишера, 2-й Набережный пер., д. 20",
  },
  okulovka: {
    name: "ГОБУЗ «Окуловская центральная районная больница»",
    role: "Кабинет врача-дерматовенеролога",
    address: "г. Окуловка, ул. Калинина, д. 129",
  },
  chudovo: {
    name: "ГОБУЗ «Чудовская центральная районная больница»",
    role: "Кабинет врача-дерматовенеролога",
    address: "г. Чудово, ул. Косинова, д. 6",
  },
  shimsk: {
    name: "ГОБУЗ «Шимская центральная районная больница»",
    role: "Кабинет врача-дерматовенеролога",
    address: "р. п. Шимск, ул. Новгородская, д. 7",
  },
} satisfies Record<string, Facility>;

const LEGACY_TERRITORIES: Territory[] = [
  { name: "Великий Новгород", outpatientTarget: LEGACY_FACILITIES.nokvdOutpatient },
  { name: "Батецкий район", outpatientTarget: LEGACY_FACILITIES.nokvdOutpatient },
  { name: "Боровичский район", outpatientTarget: LEGACY_FACILITIES.borovichi },
  { name: "Валдайский район", outpatientTarget: LEGACY_FACILITIES.valdai },
  { name: "Волотовский округ", outpatientTarget: LEGACY_FACILITIES.starayaRussa },
  { name: "Демянский район", outpatientTarget: LEGACY_FACILITIES.starayaRussa },
  { name: "Крестецкий район", outpatientTarget: LEGACY_FACILITIES.kresttsy },
  { name: "Любытинский район", outpatientTarget: LEGACY_FACILITIES.borovichi },
  { name: "Маловишерский район", outpatientTarget: LEGACY_FACILITIES.malayaVishera },
  { name: "Марёвский округ", outpatientTarget: LEGACY_FACILITIES.starayaRussa },
  { name: "Мошенской район", outpatientTarget: LEGACY_FACILITIES.borovichi },
  { name: "Новгородский район", outpatientTarget: LEGACY_FACILITIES.nokvdOutpatient },
  { name: "Окуловский район", outpatientTarget: LEGACY_FACILITIES.okulovka },
  { name: "Парфинский район", outpatientTarget: LEGACY_FACILITIES.starayaRussa },
  { name: "Пестовский район", outpatientTarget: LEGACY_FACILITIES.pestovo },
  { name: "Поддорский район", outpatientTarget: LEGACY_FACILITIES.starayaRussa },
  { name: "Солецкий округ", outpatientTarget: LEGACY_FACILITIES.shimsk },
  { name: "Старорусский район", outpatientTarget: LEGACY_FACILITIES.starayaRussa },
  { name: "Хвойнинский округ", outpatientTarget: LEGACY_FACILITIES.borovichi },
  { name: "Холмский район", outpatientTarget: LEGACY_FACILITIES.starayaRussa },
  { name: "Чудовский район", outpatientTarget: LEGACY_FACILITIES.chudovo },
  { name: "Шимский район", outpatientTarget: LEGACY_FACILITIES.shimsk },
];

const LEGACY_CONDITION_LABELS: Record<Condition, string> = {
  angioedema: "Отёк Квинке",
  toxicoderma: "Токсикодермия",
  lyell: "Синдром Лайелла",
  stevens_johnson: "Синдром Стивенса — Джонсона",
  none: "Ни одного из перечисленных состояний нет",
};

function sourcesFor(pageReference: string): Source[] {
  return [
    { ...REGIONAL_ORDER, label: `${REGIONAL_ORDER.label}, ${pageReference}` },
    {
      label:
        "Действующий федеральный порядок: приказ Минздрава России от 24.09.2025 № 582н",
      url: FEDERAL_ORDER_URL,
    },
    {
      label:
        "Приказ Минздрава России от 15.11.2012 № 924н, на основании которого издан региональный приказ № 98-Д",
      url: PREVIOUS_FEDERAL_ORDER_URL,
    },
  ];
}

export function evaluateRoutingLegacy(state: FormState): RoutingResult | null {
  const territory = LEGACY_TERRITORIES.find((item) => item.name === state.territory);
  if (!territory || !state.condition) return null;

  if (state.condition !== "none") {
    const condition = LEGACY_CONDITION_LABELS[state.condition];
    return {
      title: `${condition}: экстренная госпитализация`,
      target: LEGACY_FACILITIES.nearestIcu,
      afterStabilization: LEGACY_FACILITIES.nokvdInpatient,
      urgency: "Экстренно",
      transport:
        "Бригадой СМП после оперативного согласования принимающей медицинской организации.",
      actions: [
        "Согласовать ближайшую доступную медицинскую организацию с ОАРИТ или палатой интенсивной терапии.",
        "Предупредить принимающую медицинскую организацию и сообщить расчётное время прибытия.",
        "Оказывать помощь и наблюдать пациента в соответствии с действующими протоколами СМП.",
      ],
      handoff: [
        "Предполагаемый диагноз и время начала симптомов.",
        "Состояние дыхательных путей, показатели дыхания и гемодинамики.",
        "Поражение кожи и слизистых, известные аллергены и недавно принятые лекарства.",
        "Проведённые мероприятия и динамика состояния.",
      ],
      sources: [
        ...sourcesFor(
          "пункт 8, страница 4: перечислены четыре состояния и маршрут в территориально ближайшую МО с ОАРИТ/ПИТ",
        ),
        {
          label:
            "Порядок оказания скорой медицинской помощи и медицинской эвакуации: приказ Минздрава России от 20.06.2013 № 388н",
          url: EMERGENCY_CARE_ORDER_URL,
        },
      ],
    };
  }

  if (state.inpatientCare === undefined) return null;

  if (state.inpatientCare) {
    return {
      title: "Показана специализированная стационарная помощь",
      target: LEGACY_FACILITIES.nokvdInpatient,
      urgency: "По клиническим показаниям",
      transport:
        "Способ транспортировки определяется состоянием пациента; госпитализацию предварительно согласовать.",
      actions: [
        "Исключить жизнеугрожающее состояние перед профильной транспортировкой.",
        "Согласовать госпитализацию с принимающим профильным стационаром.",
        "Уточнить лекарства, аллергологический и эпидемиологический анамнез.",
      ],
      handoff: [
        "Причина невозможности амбулаторного лечения.",
        "Начало и динамика заболевания.",
        "Сопутствующие заболевания, лекарства и аллергии.",
      ],
      sources: sourcesFor(
        "пункт 10 и приложение, страницы 5–8: профильный стационар для всех территорий — ОАУЗ «НОКВД»",
      ),
    };
  }

  return {
    title: "Амбулаторный маршрут по территории",
    target: territory.outpatientTarget,
    urgency: "Планово или неотложно — по клиническому состоянию",
    transport:
      "Экстренная транспортировка СМП по этой ветке приказом не предусмотрена; организовать направление или рекомендовать обращение.",
    actions: [
      "Убедиться в отсутствии перечисленных жизнеугрожающих состояний.",
      "Зафиксировать жалобы, локализацию и распространённость поражения.",
      "Уточнить режим приёма территориального кабинета и сообщить пациенту срок обращения.",
    ],
    handoff: [
      "Начало и динамика заболевания.",
      "Локализация поражения кожи и слизистых.",
      "Лекарства, аллергии и эпидемиологический анамнез.",
    ],
    sources: sourcesFor(
      "приложение, страницы 6–8: зональное распределение первичной специализированной помощи",
    ),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFacility(value: unknown): value is Facility {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.role === "string" &&
    typeof value.address === "string"
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isSourceArray(value: unknown): value is Source[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.label === "string" &&
        (item.url === undefined || typeof item.url === "string"),
    )
  );
}

function routingResultFromRules(value: unknown): RoutingResult {
  if (
    !isRecord(value) ||
    typeof value.title !== "string" ||
    !isFacility(value.target) ||
    typeof value.urgency !== "string" ||
    typeof value.transport !== "string" ||
    !isStringArray(value.actions) ||
    !isStringArray(value.handoff) ||
    !isSourceArray(value.sources) ||
    (value.afterStabilization !== undefined &&
      !isFacility(value.afterStabilization))
  ) {
    throw new Error("rules_v1 вернул некорректный результат дерматовенерологии.");
  }
  return value as RoutingResult;
}

export function evaluateRoutingRulesV1(
  state: FormState,
): RoutingResult | null {
  const evaluation = evaluateRoutingRuleSetV1(
    DERMATOLOGY_RULE_SET_V1,
    state,
  );
  return evaluation ? routingResultFromRules(evaluation.result) : null;
}

export function evaluateRouting(state: FormState): RoutingResult | null {
  return evaluateRoutingRulesV1(state);
}

export const dermatologyRoutingProfile = {
  id: "dermatology",
  title: "Дерматовенерология",
  description: "Территория → состояние → учреждение и адрес",
  content: dermatologyRoutingContent,
  evaluate: evaluateRouting,
} satisfies RoutingProfileDefinition<FormState, RoutingResult>;
