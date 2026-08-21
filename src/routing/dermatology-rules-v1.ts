import type { RoutingRuleSetV1, RoutingTemplateV1 } from "./rules-v1.js";

const FEDERAL_ORDER_URL =
  "https://publication.pravo.gov.ru/document/0001202510280015";
const PREVIOUS_FEDERAL_ORDER_URL =
  "https://minzdrav.gov.ru/documents/9101-poryadok-okazaniya-meditsinskoy-pomoschi-po-profilyu-dermatovenerologiya-utv-prikazom-ministerstva-zdravoohraneniya-rossiyskoy-federatsii-ot-15-noyabrya-2012-g-924n";
const EMERGENCY_CARE_ORDER_URL =
  "https://minzdrav.gov.ru/ministry/61/3/stranitsa-992/prikaz-minzdrava-rossii-ot-20-06-2013-n-388n-red-ot-21-02-2020-ob-utverzhdenii-poryadka-okazaniya-skoroy-v-tom-chisle-skoroy-spetsializirovannoy-meditsinskoy-pomoschi";

const REGIONAL_ORDER_LABEL =
  "Приказ Министерства здравоохранения Новгородской области от 01.02.2022 № 98-Д, приложение к приказу";

const FACILITIES = {
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
} as const;

const TERRITORY_TARGETS = {
  "Великий Новгород": FACILITIES.nokvdOutpatient,
  "Батецкий район": FACILITIES.nokvdOutpatient,
  "Боровичский район": FACILITIES.borovichi,
  "Валдайский район": FACILITIES.valdai,
  "Волотовский округ": FACILITIES.starayaRussa,
  "Демянский район": FACILITIES.starayaRussa,
  "Крестецкий район": FACILITIES.kresttsy,
  "Любытинский район": FACILITIES.borovichi,
  "Маловишерский район": FACILITIES.malayaVishera,
  "Марёвский округ": FACILITIES.starayaRussa,
  "Мошенской район": FACILITIES.borovichi,
  "Новгородский район": FACILITIES.nokvdOutpatient,
  "Окуловский район": FACILITIES.okulovka,
  "Парфинский район": FACILITIES.starayaRussa,
  "Пестовский район": FACILITIES.pestovo,
  "Поддорский район": FACILITIES.starayaRussa,
  "Солецкий округ": FACILITIES.shimsk,
  "Старорусский район": FACILITIES.starayaRussa,
  "Хвойнинский округ": FACILITIES.borovichi,
  "Холмский район": FACILITIES.starayaRussa,
  "Чудовский район": FACILITIES.chudovo,
  "Шимский район": FACILITIES.shimsk,
} as const;

export const DERMATOLOGY_TERRITORIES = Object.entries(TERRITORY_TARGETS).map(
  ([name, outpatientTarget]) => ({ name, outpatientTarget }),
);

export const DERMATOLOGY_CONDITION_LABELS = {
  angioedema: "Отёк Квинке",
  toxicoderma: "Токсикодермия",
  lyell: "Синдром Лайелла",
  stevens_johnson: "Синдром Стивенса — Джонсона",
  none: "Ни одного из перечисленных состояний нет",
} as const;

const TERRITORY_NAMES = Object.keys(TERRITORY_TARGETS);
const EMERGENCY_CONDITIONS = [
  "angioedema",
  "toxicoderma",
  "lyell",
  "stevens_johnson",
] as const;

function sourcesFor(pageReference: string): RoutingTemplateV1[] {
  return [
    { label: `${REGIONAL_ORDER_LABEL}, ${pageReference}` },
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

export const DERMATOLOGY_RULE_SET_V1 = {
  schemaVersion: 1,
  id: "dermatology.v1",
  profileId: "dermatology",
  catalogs: {
    conditionLabels: DERMATOLOGY_CONDITION_LABELS,
    facilities: FACILITIES,
    territories: TERRITORY_TARGETS,
  },
  rules: [
    {
      id: "emergency_icu",
      priority: 10,
      when: {
        op: "all",
        conditions: [
          { op: "in", field: "territory", values: TERRITORY_NAMES },
          { op: "in", field: "condition", values: EMERGENCY_CONDITIONS },
        ],
      },
      result: {
        title: {
          $concat: [
            {
              $catalog: "conditionLabels",
              key: { $field: "condition" },
            },
            ": экстренная госпитализация",
          ],
        },
        target: { $catalog: "facilities", key: "nearestIcu" },
        targetLabel: "Первый этап маршрута",
        afterStabilization: {
          $catalog: "facilities",
          key: "nokvdInpatient",
        },
        afterStabilizationLabel: "После стабилизации",
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
      },
    },
    {
      id: "inpatient",
      priority: 20,
      when: {
        op: "all",
        conditions: [
          { op: "in", field: "territory", values: TERRITORY_NAMES },
          { op: "eq", field: "condition", value: "none" },
          { op: "eq", field: "inpatientCare", value: true },
        ],
      },
      result: {
        title: "Показана специализированная стационарная помощь",
        target: { $catalog: "facilities", key: "nokvdInpatient" },
        targetLabel: "Куда госпитализировать",
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
      },
    },
    {
      id: "outpatient",
      priority: 30,
      when: {
        op: "all",
        conditions: [
          { op: "in", field: "territory", values: TERRITORY_NAMES },
          { op: "eq", field: "condition", value: "none" },
          { op: "eq", field: "inpatientCare", value: false },
        ],
      },
      result: {
        title: "Амбулаторный маршрут по территории",
        target: { $catalog: "territories", key: { $field: "territory" } },
        targetLabel: "Куда направить пациента",
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
      },
    },
  ],
} as const satisfies RoutingRuleSetV1;
