import type {
  RoutingConditionV1,
  RoutingRuleSetV1,
  RoutingTemplateV1,
} from "./rules-v1";

const FEDERAL_ADULT_ORDER_URL =
  "https://publication.pravo.gov.ru/document/0001202509230019";
const EMERGENCY_CARE_ORDER_URL =
  "https://minzdrav.gov.ru/ministry/61/3/stranitsa-992/prikaz-minzdrava-rossii-ot-20-06-2013-n-388n-red-ot-21-02-2020-ob-utverzhdenii-poryadka-okazaniya-skoroy-v-tom-chisle-skoroy-spetsializirovannoy-meditsinskoy-pomoschi";

const REGIONAL_ORDER_LABEL =
  "Приказ Министерства здравоохранения Новгородской области от 18.03.2022 № 302-Д «Об утверждении Порядка оказания медицинской помощи больным инфекционными заболеваниями в медицинских организациях Новгородской области»";
const SEASONAL_ORDER_LABEL =
  "Приказ Министерства здравоохранения Новгородской области от 28.08.2025 № 920-Д «Об организации работы медицинских организаций в период предэпидемического и эпидемического подъема заболеваемости гриппом, ОРВИ, внебольничными пневмониями и COVID-19 в эпидемическом сезоне 2025–2026 годов»";

const FACILITIES = {
  unspecifiedIcu: {
    name: "Реанимационное отделение медицинской организации",
    role: "Стабилизация жизнеугрожающего состояния с соблюдением санитарно-противоэпидемического режима",
    address:
      "Конкретная организация приказом № 302-Д не определена; маршрут должен быть подтверждён диспетчером и принимающим стационаром",
  },
  noib: {
    name: "ГОБУЗ «Новгородская областная инфекционная больница»",
    role: "Профильный инфекционный стационар областного уровня",
    address: "Великий Новгород, ул. Тимура Фрунзе-Оловянка, д. 21",
  },
  borovichi: {
    name: "ГОБУЗ «Боровичская центральная районная больница»",
    role: "Территориальный инфекционный стационар",
    address: "г. Боровичи, пл. 1 Мая, д. 2А",
  },
  starayaRussa: {
    name: "ГОБУЗ «Старорусская центральная районная больница»",
    role: "Территориальный инфекционный стационар",
    address: "г. Старая Русса, ул. Гостинодворская, д. 50",
  },
  pestovo: {
    name: "ГОБУЗ «Пестовская центральная районная больница»",
    role: "Территориальный инфекционный стационар",
    address: "г. Пестово, ул. Курганная, д. 18",
  },
  cgkb: {
    name: "ГОБУЗ «Центральная городская клиническая больница»",
    role: "Стационар, указанный в сезонной схеме для взрослых с гриппом, ОРВИ и внебольничной пневмонией",
    address:
      "Великий Новгород, ул. Зелинского, д. 11; принимающий корпус и въезд подтвердить",
    url: "https://novgorzdrav.ru/",
  },
  valdai: {
    name: "Валдайский многопрофильный медицинский центр ФГБУ СЗОНКЦ им. Л. Г. Соколова ФМБА России",
    role: "Стационар, указанный в сезонной схеме для Валдайского района",
    address: "г. Валдай, ул. Песчаная, д. 1б",
    url: "https://vmmc.ru/contact/",
  },
  outpatient: {
    name: "Территориальная медицинская организация по месту вызова",
    role: "Амбулаторная помощь и динамическое наблюдение с разделением потоков пациентов",
    address:
      "Госпитализация по выбранным критериям не показана; передайте пациента под наблюдение территориальной медицинской организации",
  },
} as const;

export const INFECTIOUS_GROUP_LABELS_V1 = {
  general: "Другое или пока неуточнённое инфекционное заболевание",
  flu_orvi_vp: "Грипп, ОРВИ или внебольничная пневмония",
  covid: "Новая коронавирусная инфекция (COVID-19)",
} as const;

export const INFECTIOUS_LIFE_THREAT_LABELS_V1 = {
  infectious_toxic_shock: "Инфекционно-токсический шок",
  hypovolemic_shock: "Гиповолемический шок",
  cerebral_edema: "Отёк-набухание головного мозга",
  renal_failure: "Острая почечная недостаточность",
  hepatic_failure: "Острая печёночная недостаточность",
  cardiovascular_failure: "Острая сердечно-сосудистая недостаточность",
  respiratory_failure: "Острая дыхательная недостаточность",
  none: "Перечисленных жизнеугрожающих состояний нет",
} as const;

export const INFECTIOUS_ADMISSION_LABELS_V1 = {
  severe: "Тяжёлое течение инфекционного заболевания",
  moderate: "Среднетяжёлое течение, требующее стационарного лечения",
  diagnosis_unavailable: "Невозможно установить диагноз в амбулаторных условиях",
  differential_diagnostics:
    "Нужны лабораторные или инструментальные исследования для дифференциальной диагностики",
  no_outpatient_effect:
    "Нет клинического эффекта от проводимой амбулаторной терапии",
  epidemiological:
    "Лёгкое течение, но имеются эпидемиологические показания к госпитализации",
  unclear_infectious_diagnosis:
    "Диагноз неясен, но симптомы или отклонения позволяют подозревать инфекционное заболевание",
  none: "Показаний к стационарному лечению не выявлено",
} as const;

export const INFECTIOUS_RESPIRATORY_ADMISSION_LABELS_V1 = {
  resp_fever_5_days:
    "Температура тела выше 38,5 °C сохраняется в течение 5 дней на амбулаторном лечении",
  resp_fever_hypoxemia:
    "Температура выше 38,5 °C и имеется SpO₂ ниже 95 % или частота дыхания более 22 в минуту",
  resp_pneumonia: "Имеется или подозревается внебольничная пневмония",
  resp_severe_course:
    "Тяжёлое течение: выраженная интоксикация, температура выше 39 °C и признаки дыхательной, сердечной, почечной или полиорганной недостаточности",
  resp_medical_risk:
    "Любая тяжесть заболевания и высокий медицинский риск: возраст старше 65 лет, значимые хронические заболевания, иммунодефицит, гемодиализ или иммуносупрессивная терапия",
  resp_pregnancy: "Беременность",
  resp_isolation_impossible:
    "Невозможно изолировать пациента по месту жительства или в организованном/закрытом коллективе",
  resp_no_monitoring:
    "Невозможно обеспечить постоянное медицинское наблюдение, в том числе в удалённой или труднодоступной местности",
  none: "Показаний к стационарному лечению не выявлено",
} as const;

export const INFECTIOUS_TERRITORIES_V1 = [
  { name: "Великий Новгород", routeGroup: "direct" },
  { name: "Батецкий район", routeGroup: "direct" },
  { name: "Боровичский район", routeGroup: "borovichi" },
  { name: "Валдайский район", routeGroup: "direct" },
  { name: "Волотовский округ", routeGroup: "staraya_russa" },
  { name: "Демянский район", routeGroup: "staraya_russa" },
  { name: "Крестецкий район", routeGroup: "direct" },
  { name: "Любытинский район", routeGroup: "borovichi" },
  { name: "Маловишерский район", routeGroup: "direct" },
  { name: "Марёвский округ", routeGroup: "staraya_russa" },
  { name: "Мошенской район", routeGroup: "borovichi" },
  { name: "Новгородский район", routeGroup: "direct" },
  { name: "Окуловский район", routeGroup: "borovichi" },
  { name: "Парфинский район", routeGroup: "staraya_russa" },
  { name: "Пестовский район", routeGroup: "pestovo" },
  { name: "Поддорский район", routeGroup: "staraya_russa" },
  { name: "Солецкий округ", routeGroup: "direct" },
  { name: "Старорусский район", routeGroup: "staraya_russa" },
  { name: "Хвойнинский округ", routeGroup: "borovichi" },
  { name: "Холмский район", routeGroup: "staraya_russa" },
  { name: "Чудовский район", routeGroup: "direct" },
  { name: "Шимский район", routeGroup: "direct" },
] as const;

const BOROVICHI_RESPIRATORY_TERRITORIES = new Set([
  "Боровичский район",
  "Мошенской район",
  "Хвойнинский округ",
  "Любытинский район",
  "Окуловский район",
  "Пестовский район",
]);
const STARAYA_RUSSA_RESPIRATORY_TERRITORIES = new Set([
  "Старорусский район",
  "Волотовский округ",
  "Парфинский район",
  "Поддорский район",
  "Холмский район",
  "Демянский район",
  "Марёвский округ",
]);

const TERRITORY_NAMES = INFECTIOUS_TERRITORIES_V1.map((item) => item.name);
const DIRECT_TERRITORIES = INFECTIOUS_TERRITORIES_V1.filter(
  (item) => item.routeGroup === "direct",
).map((item) => item.name);
const STAGED_TERRITORIES = INFECTIOUS_TERRITORIES_V1.filter(
  (item) => item.routeGroup !== "direct",
).map((item) => item.name);

function generalTarget(routeGroup: string) {
  if (routeGroup === "borovichi") return FACILITIES.borovichi;
  if (routeGroup === "staraya_russa") return FACILITIES.starayaRussa;
  if (routeGroup === "pestovo") return FACILITIES.pestovo;
  return FACILITIES.noib;
}

const TERRITORIAL_TARGETS = Object.fromEntries(
  INFECTIOUS_TERRITORIES_V1.map((territory) => [
    territory.name,
    generalTarget(territory.routeGroup),
  ]),
);

function seasonalTargets(territory: string, group: "flu_orvi_vp" | "covid") {
  if (BOROVICHI_RESPIRATORY_TERRITORIES.has(territory)) {
    return [FACILITIES.borovichi];
  }
  if (group === "covid") return [FACILITIES.noib];
  if (STARAYA_RUSSA_RESPIRATORY_TERRITORIES.has(territory)) {
    return [FACILITIES.starayaRussa];
  }
  if (territory === "Валдайский район") return [FACILITIES.valdai];
  return [FACILITIES.noib, FACILITIES.cgkb];
}

const SEASONAL_PRIMARY_TARGETS: Record<string, RoutingTemplateV1> = {};
const SEASONAL_REFERENCE_TARGETS: Record<string, RoutingTemplateV1> = {};
const SEASONAL_ALL_TARGETS: Record<string, RoutingTemplateV1> = {};
const SEASONAL_TRANSPORT: Record<string, RoutingTemplateV1> = {};
(["flu_orvi_vp", "covid"] as const).forEach((group) => {
  TERRITORY_NAMES.forEach((territory) => {
    const key = `${group}|${territory}`;
    const targets = seasonalTargets(territory, group);
    SEASONAL_PRIMARY_TARGETS[key] = targets[0]!;
    SEASONAL_REFERENCE_TARGETS[key] = targets.slice(1);
    SEASONAL_ALL_TARGETS[key] = targets;
    SEASONAL_TRANSPORT[key] =
      targets.length > 1
        ? "Приказ указывает несколько медицинских организаций; конкретную принимающую организацию и корпус необходимо подтвердить до транспортировки."
        : "В указанную медицинскую организацию после подтверждения приёма и конкретного принимающего корпуса.";
  });
});

function sourcesFor(reference: string): RoutingTemplateV1[] {
  return [
    { label: `${REGIONAL_ORDER_LABEL}; ${reference}` },
    {
      label:
        "Действующий федеральный порядок для взрослых: приказ Минздрава России от 21.08.2025 № 495н",
      url: FEDERAL_ADULT_ORDER_URL,
    },
    {
      label:
        "Порядок оказания скорой медицинской помощи и медицинской эвакуации: приказ Минздрава России от 20.06.2013 № 388н",
      url: EMERGENCY_CARE_ORDER_URL,
    },
  ];
}

function seasonalSourcesFor(reference: string): RoutingTemplateV1[] {
  return [
    { label: `${SEASONAL_ORDER_LABEL}; ${reference}` },
    ...sourcesFor("").slice(1),
  ];
}

const LIFE_THREAT_VALUES = [
  "infectious_toxic_shock",
  "hypovolemic_shock",
  "cerebral_edema",
  "renal_failure",
  "hepatic_failure",
  "cardiovascular_failure",
  "respiratory_failure",
] as const;

const HAS_LIFE_THREAT: RoutingConditionV1 = {
  op: "any",
  conditions: LIFE_THREAT_VALUES.map((value) => ({
    op: "includes" as const,
    field: "lifeThreats",
    value,
  })),
};
const NO_LIFE_THREAT: RoutingConditionV1 = {
  op: "not",
  condition: HAS_LIFE_THREAT,
};

const VALID_TERRITORY: RoutingConditionV1 = {
  op: "in",
  field: "territory",
  values: TERRITORY_NAMES,
};
const HAS_LIFE_THREAT_ANSWER: RoutingConditionV1 = {
  op: "non_empty",
  field: "lifeThreats",
};
const HAS_ADMISSION_ANSWER: RoutingConditionV1 = {
  op: "non_empty",
  field: "admissionCriteria",
};

const GENERAL_LIFE_SOURCES = sourcesFor(
  "приложение № 1, страницы 2–3: помощь при жизнеугрожающих состояниях оказывается в реанимационных отделениях медицинских организаций; после стабилизации предусмотрена эвакуация в ГОБУЗ «НОИБ»",
);
const SEASONAL_LIFE_SOURCES: RoutingTemplateV1[] = [
  GENERAL_LIFE_SOURCES[0],
  {
    label: `${SEASONAL_ORDER_LABEL}; приложение № 4, страница 12: территориальная схема госпитализации взрослых по указанным диагнозам`,
  },
  ...GENERAL_LIFE_SOURCES.slice(1),
];

const LIFE_THREAT_HANDOFF: RoutingTemplateV1[] = [
  {
    $joinCatalog: {
      field: "lifeThreats",
      catalog: "lifeThreatLabels",
      exclude: ["none"],
      separator: ", ",
      prefix: "Угрожающие состояния: ",
      suffix: ".",
    },
  },
  "Показатели дыхания, гемодинамики, сознания и проведённые мероприятия.",
  "Предполагаемый инфекционный диагноз и эпидемиологический анамнез.",
];

const BASE_CATALOGS = {
  facilities: FACILITIES,
  groupLabels: INFECTIOUS_GROUP_LABELS_V1,
  lifeThreatLabels: INFECTIOUS_LIFE_THREAT_LABELS_V1,
  admissionGeneral: INFECTIOUS_ADMISSION_LABELS_V1,
  admissionRespiratory: INFECTIOUS_RESPIRATORY_ADMISSION_LABELS_V1,
  seasonalPrimary: SEASONAL_PRIMARY_TARGETS,
  seasonalReferences: SEASONAL_REFERENCE_TARGETS,
  seasonalAll: SEASONAL_ALL_TARGETS,
  seasonalTransport: SEASONAL_TRANSPORT,
  territorialTargets: TERRITORIAL_TARGETS,
} as const;

function admissionHandoff(catalog: "admissionGeneral" | "admissionRespiratory") {
  return {
    $joinCatalog: {
      field: "admissionCriteria",
      catalog,
      exclude: ["none"],
      separator: ", ",
      prefix: "Показания к стационару: ",
      suffix: ".",
    },
  } as const;
}

function seasonalKey() {
  return {
    $concat: [
      { $field: "infectionGroup" },
      "|",
      { $field: "territory" },
    ],
  } as const;
}

export const INFECTIOUS_RULE_SET_V1 = {
  schemaVersion: 1,
  id: "infectious.v1",
  profileId: "infectious",
  catalogs: BASE_CATALOGS,
  rules: [
    {
      id: "life_threat_general",
      priority: 10,
      when: {
        op: "all",
        conditions: [
          VALID_TERRITORY,
          { op: "eq", field: "infectionGroup", value: "general" },
          HAS_LIFE_THREAT_ANSWER,
          HAS_LIFE_THREAT,
        ],
      },
      result: {
        title: "Жизнеугрожающее инфекционное состояние",
        target: { $catalog: "facilities", key: "unspecifiedIcu" },
        targetLabel: "Первый этап маршрута",
        nextTarget: { $catalog: "facilities", key: "noib" },
        nextTargetLabel: "После стабилизации — медицинская эвакуация",
        urgency: "Экстренно",
        transport:
          "В реанимационное отделение медицинской организации после оперативного подтверждения маршрута. Приказ № 302-Д не закрепляет конкретную ОАРИТ за выбранной территорией.",
        actions: [
          "Немедленно запросить у диспетчера конкретную медицинскую организацию с реанимационным отделением и подтвердить готовность приёма.",
          "Поддерживать жизненно важные функции и соблюдать санитарно-противоэпидемический режим.",
          "После стабилизации согласовать медицинскую эвакуацию в Новгородскую областную инфекционную больницу.",
        ],
        handoff: LIFE_THREAT_HANDOFF,
        sources: GENERAL_LIFE_SOURCES,
        warning:
          "Нормативный пробел: приказ № 302-Д не содержит таблицы «территория → конкретная ОАРИТ». Не подставляйте предполагаемую больницу без подтверждения диспетчера и принимающей организации.",
      },
    },
    {
      id: "life_threat_seasonal",
      priority: 20,
      when: {
        op: "all",
        conditions: [
          VALID_TERRITORY,
          {
            op: "in",
            field: "infectionGroup",
            values: ["flu_orvi_vp", "covid"],
          },
          HAS_LIFE_THREAT_ANSWER,
          HAS_LIFE_THREAT,
        ],
      },
      result: {
        title: "Жизнеугрожающее инфекционное состояние",
        target: { $catalog: "facilities", key: "unspecifiedIcu" },
        targetLabel: "Первый этап маршрута",
        referenceTargets: {
          $catalog: "seasonalAll",
          key: seasonalKey(),
        },
        referenceTargetsLabel:
          "Стационар из сезонной схемы по диагнозу — справочно, не назначение конкретной ОАРИТ",
        urgency: "Экстренно",
        transport:
          "В реанимационное отделение медицинской организации после оперативного подтверждения маршрута. Приказ № 302-Д не закрепляет конкретную ОАРИТ за выбранной территорией.",
        actions: [
          "Немедленно запросить у диспетчера конкретную медицинскую организацию с реанимационным отделением и подтвердить готовность приёма.",
          "Поддерживать жизненно важные функции и соблюдать санитарно-противоэпидемический режим.",
          "После стабилизации повторно согласовать профильный маршрут с учётом сезонной схемы и готовности принимающего стационара.",
        ],
        handoff: LIFE_THREAT_HANDOFF,
        sources: SEASONAL_LIFE_SOURCES,
        warning:
          "Нормативный пробел: приказ № 302-Д не содержит таблицы «территория → конкретная ОАРИТ». Указанные стационары сезонной схемы не следует автоматически считать назначенной ОАРИТ без подтверждения диспетчера и принимающей организации.",
      },
    },
    {
      id: "outpatient_general",
      priority: 30,
      when: {
        op: "all",
        conditions: [
          VALID_TERRITORY,
          { op: "eq", field: "infectionGroup", value: "general" },
          HAS_LIFE_THREAT_ANSWER,
          NO_LIFE_THREAT,
          { op: "includes", field: "admissionCriteria", value: "none" },
        ],
      },
      result: {
        title: "Стационарная маршрутизация не требуется",
        target: { $catalog: "facilities", key: "outpatient" },
        targetLabel: "Дальнейшее наблюдение",
        urgency: "По клиническому состоянию",
        transport:
          "Перевозка в инфекционный стационар по выбранным критериям не требуется.",
        actions: [
          "Организовать передачу информации территориальной медицинской организации.",
          "Исключить совместное ожидание пациента с общим потоком при обращении в медицинскую организацию.",
          "При ухудшении состояния повторно оценить показания к госпитализации.",
        ],
        handoff: [
          "Предполагаемый диагноз, дата начала заболевания и эпидемиологический анамнез.",
          "Основание для амбулаторного наблюдения и признаки, требующие повторного вызова СМП.",
        ],
        sources: sourcesFor(
          "приложение № 1, страница 2: лёгкое течение без показаний к стационарному лечению ведётся амбулаторно",
        ),
      },
    },
    {
      id: "outpatient_seasonal",
      priority: 40,
      when: {
        op: "all",
        conditions: [
          VALID_TERRITORY,
          {
            op: "in",
            field: "infectionGroup",
            values: ["flu_orvi_vp", "covid"],
          },
          HAS_LIFE_THREAT_ANSWER,
          NO_LIFE_THREAT,
          { op: "includes", field: "admissionCriteria", value: "none" },
        ],
      },
      result: {
        title: "Стационарная маршрутизация не требуется",
        target: { $catalog: "facilities", key: "outpatient" },
        targetLabel: "Дальнейшее наблюдение",
        urgency: "По клиническому состоянию",
        transport:
          "Перевозка в инфекционный стационар по выбранным критериям не требуется.",
        actions: [
          "Организовать передачу информации территориальной медицинской организации.",
          "Исключить совместное ожидание пациента с общим потоком при обращении в медицинскую организацию.",
          "При ухудшении состояния повторно оценить показания к госпитализации.",
        ],
        handoff: [
          "Предполагаемый диагноз, дата начала заболевания и эпидемиологический анамнез.",
          "Основание для амбулаторного наблюдения и признаки, требующие повторного вызова СМП.",
        ],
        sources: seasonalSourcesFor(
          "приложение № 2, страница 9: перечень показаний для госпитализации взрослых",
        ),
      },
    },
    {
      id: "seasonal_flu",
      priority: 50,
      when: {
        op: "all",
        conditions: [
          VALID_TERRITORY,
          { op: "eq", field: "infectionGroup", value: "flu_orvi_vp" },
          HAS_LIFE_THREAT_ANSWER,
          NO_LIFE_THREAT,
          HAS_ADMISSION_ANSWER,
          {
            op: "not",
            condition: {
              op: "includes",
              field: "admissionCriteria",
              value: "none",
            },
          },
        ],
      },
      result: {
        title:
          "Показана госпитализация по сезонной схеме гриппа, ОРВИ или внебольничной пневмонии",
        target: { $catalog: "seasonalPrimary", key: seasonalKey() },
        targetLabel: "Куда госпитализировать по приказу № 920-Д",
        referenceTargets: {
          $catalog: "seasonalReferences",
          key: seasonalKey(),
        },
        referenceTargetsLabel: "Также указано в территориальной схеме",
        urgency: "По клиническим показаниям после согласования",
        transport: { $catalog: "seasonalTransport", key: seasonalKey() },
        actions: [
          "Сообщить диспетчеру выбранную территорию, предполагаемый диагноз и показания к госпитализации.",
          "Подтвердить конкретную принимающую организацию, корпус и въезд до начала транспортировки.",
          "Соблюдать санитарно-противоэпидемический режим во время транспортировки.",
        ],
        handoff: [
          {
            $concat: [
              "Группа инфекции: ",
              {
                $catalog: "groupLabels",
                key: { $field: "infectionGroup" },
              },
              ".",
            ],
          },
          admissionHandoff("admissionRespiratory"),
          "Состояние в динамике, эпидемиологический анамнез и проведённые мероприятия.",
        ],
        sources: seasonalSourcesFor(
          "приложение № 4, страница 12: схема маршрутизации взрослого населения, подлежащего госпитализации",
        ),
        warning:
          "Приказ № 920-Д относится к эпидемическому сезону 2025–2026 годов. Перед применением необходимо убедиться, что он не заменён новой сезонной или оперативной схемой.",
      },
    },
    {
      id: "seasonal_covid",
      priority: 60,
      when: {
        op: "all",
        conditions: [
          VALID_TERRITORY,
          { op: "eq", field: "infectionGroup", value: "covid" },
          HAS_LIFE_THREAT_ANSWER,
          NO_LIFE_THREAT,
          HAS_ADMISSION_ANSWER,
          {
            op: "not",
            condition: {
              op: "includes",
              field: "admissionCriteria",
              value: "none",
            },
          },
        ],
      },
      result: {
        title: "Показана госпитализация по сезонной схеме COVID-19",
        target: { $catalog: "seasonalPrimary", key: seasonalKey() },
        targetLabel: "Куда госпитализировать по приказу № 920-Д",
        referenceTargets: {
          $catalog: "seasonalReferences",
          key: seasonalKey(),
        },
        referenceTargetsLabel: "Также указано в территориальной схеме",
        urgency: "По клиническим показаниям после согласования",
        transport: { $catalog: "seasonalTransport", key: seasonalKey() },
        actions: [
          "Сообщить диспетчеру выбранную территорию, предполагаемый диагноз и показания к госпитализации.",
          "Подтвердить конкретную принимающую организацию, корпус и въезд до начала транспортировки.",
          "Соблюдать санитарно-противоэпидемический режим во время транспортировки.",
        ],
        handoff: [
          {
            $concat: [
              "Группа инфекции: ",
              {
                $catalog: "groupLabels",
                key: { $field: "infectionGroup" },
              },
              ".",
            ],
          },
          admissionHandoff("admissionRespiratory"),
          "Состояние в динамике, эпидемиологический анамнез и проведённые мероприятия.",
        ],
        sources: seasonalSourcesFor(
          "приложение № 4, страница 12: схема маршрутизации взрослого населения, подлежащего госпитализации",
        ),
        warning:
          "Приказ № 920-Д относится к эпидемическому сезону 2025–2026 годов. Перед применением необходимо убедиться, что он не заменён новой сезонной или оперативной схемой.",
      },
    },
    {
      id: "severe_transportable",
      priority: 70,
      when: {
        op: "all",
        conditions: [
          VALID_TERRITORY,
          { op: "eq", field: "infectionGroup", value: "general" },
          HAS_LIFE_THREAT_ANSWER,
          NO_LIFE_THREAT,
          HAS_ADMISSION_ANSWER,
          { op: "includes", field: "admissionCriteria", value: "severe" },
          { op: "eq", field: "transportable", value: true },
        ],
      },
      result: {
        title: "Тяжёлое течение: прямой профильный маршрут",
        target: { $catalog: "facilities", key: "noib" },
        targetLabel: "Куда госпитализировать",
        urgency: "Экстренно после обязательного согласования",
        transport:
          "Бригадой СМП непосредственно в Новгородскую областную инфекционную больницу после подтверждения приёма.",
        actions: [
          "Согласовать госпитализацию с заведующим отделением реанимации и интенсивной терапии и руководителем принимающей организации.",
          "Сообщить диспетчеру подтверждённый маршрут и расчётное время доставки.",
          "Соблюдать санитарно-противоэпидемический режим во время транспортировки.",
        ],
        handoff: [
          "Признаки тяжёлого течения и обоснование транспортабельности.",
          "Показатели дыхания, гемодинамики и сознания в динамике.",
          "Предполагаемый диагноз, эпидемиологический анамнез и проведённые мероприятия.",
        ],
        sources: sourcesFor(
          "приложение № 1, страница 3: транспортабельные пациенты с тяжёлым течением госпитализируются непосредственно в ГОБУЗ «НОИБ» по согласованию",
        ),
      },
    },
    {
      id: "severe_nontransportable",
      priority: 80,
      when: {
        op: "all",
        conditions: [
          VALID_TERRITORY,
          { op: "eq", field: "infectionGroup", value: "general" },
          HAS_LIFE_THREAT_ANSWER,
          NO_LIFE_THREAT,
          HAS_ADMISSION_ANSWER,
          { op: "includes", field: "admissionCriteria", value: "severe" },
          { op: "eq", field: "transportable", value: false },
        ],
      },
      result: {
        title: "Тяжёлое течение: пациент нетранспортабелен",
        target: { $catalog: "facilities", key: "unspecifiedIcu" },
        targetLabel: "Первый этап маршрута",
        nextTarget: { $catalog: "facilities", key: "noib" },
        nextTargetLabel:
          "После стабилизации — при подтверждённой транспортабельности",
        urgency: "Экстренно",
        transport:
          "В медицинскую организацию, способную провести стабилизацию, после оперативного подтверждения маршрута; последующая эвакуация — отдельным решением.",
        actions: [
          "Запросить у диспетчера конкретную медицинскую организацию и подтвердить готовность приёма.",
          "Передать принимающей стороне причину нетранспортабельности и требуемый уровень помощи.",
          "После стабилизации повторно оценить транспортабельность и согласовать профильную эвакуацию.",
        ],
        handoff: [
          "Причина нетранспортабельности.",
          "Показатели дыхания, гемодинамики и сознания в динамике.",
          "Предполагаемый диагноз, эпидемиологический анамнез и проведённые мероприятия.",
        ],
        sources: sourcesFor(
          "приложение № 1, страницы 2–3: реанимационная помощь по месту первичной госпитализации и эвакуация после стабилизации",
        ),
        warning:
          "Приказ прямо описывает непосредственную госпитализацию в областную инфекционную больницу только для транспортабельных пациентов и не закрепляет конкретную ОАРИТ первого этапа за территориями.",
      },
    },
    {
      id: "territorial_direct",
      priority: 90,
      when: {
        op: "all",
        conditions: [
          { op: "in", field: "territory", values: DIRECT_TERRITORIES },
          { op: "eq", field: "infectionGroup", value: "general" },
          HAS_LIFE_THREAT_ANSWER,
          NO_LIFE_THREAT,
          HAS_ADMISSION_ANSWER,
          {
            op: "not",
            condition: {
              op: "includes",
              field: "admissionCriteria",
              value: "none",
            },
          },
          {
            op: "not",
            condition: {
              op: "includes",
              field: "admissionCriteria",
              value: "severe",
            },
          },
        ],
      },
      result: {
        title: "Показана госпитализация в областной инфекционный стационар",
        target: {
          $catalog: "territorialTargets",
          key: { $field: "territory" },
        },
        targetLabel: "Куда госпитализировать",
        urgency: "По клиническим показаниям после согласования",
        transport:
          "Бригадой СМП после подтверждения готовности принимающей медицинской организации.",
        actions: [
          "Согласовать госпитализацию с принимающей медицинской организацией и диспетчером.",
          "Уточнить конкретный принимающий корпус и подъезд: приказ указывает организацию, но не адрес приёмного отделения.",
          "Соблюдать санитарно-противоэпидемический режим во время транспортировки.",
        ],
        handoff: [
          admissionHandoff("admissionGeneral"),
          "Предполагаемый диагноз, дата начала заболевания и эпидемиологический анамнез.",
          "Состояние в динамике и проведённые мероприятия.",
        ],
        sources: sourcesFor(
          "приложение № 2, страница 4: схема территориальной маршрутизации взрослого населения с инфекционными заболеваниями",
        ),
      },
    },
    {
      id: "territorial_staged",
      priority: 100,
      when: {
        op: "all",
        conditions: [
          { op: "in", field: "territory", values: STAGED_TERRITORIES },
          { op: "eq", field: "infectionGroup", value: "general" },
          HAS_LIFE_THREAT_ANSWER,
          NO_LIFE_THREAT,
          HAS_ADMISSION_ANSWER,
          {
            op: "not",
            condition: {
              op: "includes",
              field: "admissionCriteria",
              value: "none",
            },
          },
          {
            op: "not",
            condition: {
              op: "includes",
              field: "admissionCriteria",
              value: "severe",
            },
          },
        ],
      },
      result: {
        title: "Показана госпитализация в территориальный инфекционный стационар",
        target: {
          $catalog: "territorialTargets",
          key: { $field: "territory" },
        },
        targetLabel: "Куда госпитализировать",
        nextTarget: { $catalog: "facilities", key: "noib" },
        nextTargetLabel:
          "Дальнейший профильный маршрут — при показаниях и согласовании",
        urgency: "По клиническим показаниям после согласования",
        transport:
          "Бригадой СМП после подтверждения готовности принимающей медицинской организации.",
        actions: [
          "Согласовать госпитализацию с принимающей медицинской организацией и диспетчером.",
          "Уточнить конкретный принимающий корпус и подъезд: приказ указывает организацию, но не адрес приёмного отделения.",
          "Соблюдать санитарно-противоэпидемический режим во время транспортировки.",
          "При необходимости помощи более высокого уровня согласовать перевод в Новгородскую областную инфекционную больницу.",
        ],
        handoff: [
          admissionHandoff("admissionGeneral"),
          "Предполагаемый диагноз, дата начала заболевания и эпидемиологический анамнез.",
          "Состояние в динамике и проведённые мероприятия.",
        ],
        sources: sourcesFor(
          "приложение № 2, страница 4: схема территориальной маршрутизации взрослого населения с инфекционными заболеваниями",
        ),
      },
    },
  ],
} as const satisfies RoutingRuleSetV1;
