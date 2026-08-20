import type { RoutingProfileDefinition } from "./types.js";
import { infectiousRoutingContent } from "./content-manifests.js";
import {
  INFECTIOUS_ADMISSION_LABELS_V1,
  INFECTIOUS_GROUP_LABELS_V1,
  INFECTIOUS_LIFE_THREAT_LABELS_V1,
  INFECTIOUS_RESPIRATORY_ADMISSION_LABELS_V1,
  INFECTIOUS_RULE_SET_V1,
  INFECTIOUS_TERRITORIES_V1,
} from "./infectious-rules-v1.js";
import {
  evaluateRoutingRuleSetV1,
  type RoutingRuleSetV1,
} from "./rules-v1.js";


type RouteGroup = "direct" | "pestovo" | "borovichi" | "staraya_russa";

export type InfectionGroup = "general" | "flu_orvi_vp" | "covid";

export type LifeThreat =
  | "infectious_toxic_shock"
  | "hypovolemic_shock"
  | "cerebral_edema"
  | "renal_failure"
  | "hepatic_failure"
  | "cardiovascular_failure"
  | "respiratory_failure"
  | "none";

type AdmissionCriterion =
  | "severe"
  | "moderate"
  | "diagnosis_unavailable"
  | "differential_diagnostics"
  | "no_outpatient_effect"
  | "epidemiological"
  | "unclear_infectious_diagnosis"
  | "none";

type RespiratoryAdmissionCriterion =
  | "resp_fever_5_days"
  | "resp_fever_hypoxemia"
  | "resp_pneumonia"
  | "resp_severe_course"
  | "resp_medical_risk"
  | "resp_pregnancy"
  | "resp_isolation_impossible"
  | "resp_no_monitoring"
  | "none";

export type AnyAdmissionCriterion =
  | AdmissionCriterion
  | RespiratoryAdmissionCriterion;

export type Facility = {
  name: string;
  role: string;
  address: string;
  url?: string;
};

type Territory = {
  name: string;
  routeGroup: RouteGroup;
};

export type Source = {
  label: string;
  url?: string;
};

export type FormState = {
  territory?: string;
  infectionGroup?: InfectionGroup;
  lifeThreats: LifeThreat[];
  admissionCriteria: AnyAdmissionCriterion[];
  transportable?: boolean;
};

export type RoutingResult = {
  title: string;
  target: Facility;
  targetLabel: string;
  nextTarget?: Facility;
  nextTargetLabel?: string;
  referenceTargets?: Facility[];
  referenceTargetsLabel?: string;
  urgency: string;
  transport: string;
  actions: string[];
  handoff: string[];
  sources: Source[];
  warning?: string;
};

export const TERRITORIES: readonly Territory[] = INFECTIOUS_TERRITORIES_V1;
export const INFECTION_GROUP_LABELS: Readonly<
  Record<InfectionGroup, string>
> = INFECTIOUS_GROUP_LABELS_V1;
export const LIFE_THREAT_LABELS: Readonly<Record<LifeThreat, string>> =
  INFECTIOUS_LIFE_THREAT_LABELS_V1;

export function admissionLabelsFor(
  infectionGroup: InfectionGroup | undefined,
): Readonly<Record<string, string>> {
  return infectionGroup === "general"
    ? INFECTIOUS_ADMISSION_LABELS_V1
    : INFECTIOUS_RESPIRATORY_ADMISSION_LABELS_V1;
}

const FEDERAL_ADULT_ORDER_URL =
  "https://publication.pravo.gov.ru/document/0001202509230019";
const EMERGENCY_CARE_ORDER_URL =
  "https://minzdrav.gov.ru/ministry/61/3/stranitsa-992/prikaz-minzdrava-rossii-ot-20-06-2013-n-388n-red-ot-21-02-2020-ob-utverzhdenii-poryadka-okazaniya-skoroy-v-tom-chisle-skoroy-spetsializirovannoy-meditsinskoy-pomoschi";

const REGIONAL_ORDER: Source = {
  label:
    "Приказ Министерства здравоохранения Новгородской области от 18.03.2022 № 302-Д «Об утверждении Порядка оказания медицинской помощи больным инфекционными заболеваниями в медицинских организациях Новгородской области»",
};

const SEASONAL_RESPIRATORY_ORDER: Source = {
  label:
    "Приказ Министерства здравоохранения Новгородской области от 28.08.2025 № 920-Д «Об организации работы медицинских организаций в период предэпидемического и эпидемического подъема заболеваемости гриппом, ОРВИ, внебольничными пневмониями и COVID-19 в эпидемическом сезоне 2025–2026 годов»",
};

const LEGACY_FACILITIES = {
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
} satisfies Record<string, Facility>;

const LEGACY_INFECTION_GROUP_LABELS: Record<InfectionGroup, string> = {
  general: "Другое или пока неуточнённое инфекционное заболевание",
  flu_orvi_vp: "Грипп, ОРВИ или внебольничная пневмония",
  covid: "Новая коронавирусная инфекция (COVID-19)",
};

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

const LEGACY_TERRITORIES: Territory[] = [
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
];

const LEGACY_LIFE_THREAT_LABELS: Record<LifeThreat, string> = {
  infectious_toxic_shock: "Инфекционно-токсический шок",
  hypovolemic_shock: "Гиповолемический шок",
  cerebral_edema: "Отёк-набухание головного мозга",
  renal_failure: "Острая почечная недостаточность",
  hepatic_failure: "Острая печёночная недостаточность",
  cardiovascular_failure: "Острая сердечно-сосудистая недостаточность",
  respiratory_failure: "Острая дыхательная недостаточность",
  none: "Перечисленных жизнеугрожающих состояний нет",
};

const LEGACY_ADMISSION_LABELS: Record<AdmissionCriterion, string> = {
  severe: "Тяжёлое течение инфекционного заболевания",
  moderate: "Среднетяжёлое течение, требующее стационарного лечения",
  diagnosis_unavailable:
    "Невозможно установить диагноз в амбулаторных условиях",
  differential_diagnostics:
    "Нужны лабораторные или инструментальные исследования для дифференциальной диагностики",
  no_outpatient_effect:
    "Нет клинического эффекта от проводимой амбулаторной терапии",
  epidemiological:
    "Лёгкое течение, но имеются эпидемиологические показания к госпитализации",
  unclear_infectious_diagnosis:
    "Диагноз неясен, но симптомы или отклонения позволяют подозревать инфекционное заболевание",
  none: "Показаний к стационарному лечению не выявлено",
};

const LEGACY_RESPIRATORY_ADMISSION_LABELS: Record<
  RespiratoryAdmissionCriterion,
  string
> = {
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
};

function admissionLabelsForLegacy(
  infectionGroup: InfectionGroup | undefined,
): Record<string, string> {
  return infectionGroup === "general"
    ? LEGACY_ADMISSION_LABELS
    : LEGACY_RESPIRATORY_ADMISSION_LABELS;
}

function admissionLabelFor(
  item: AnyAdmissionCriterion,
  infectionGroup: InfectionGroup | undefined,
): string {
  return admissionLabelsForLegacy(infectionGroup)[item] ?? item;
}

function sourcesFor(regionalReference: string): Source[] {
  return [
    {
      ...REGIONAL_ORDER,
      label: `${REGIONAL_ORDER.label}; ${regionalReference}`,
    },
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

function seasonalSourcesFor(regionalReference: string): Source[] {
  const federalSources = sourcesFor("").slice(1);
  return [
    {
      ...SEASONAL_RESPIRATORY_ORDER,
      label: `${SEASONAL_RESPIRATORY_ORDER.label}; ${regionalReference}`,
    },
    ...federalSources,
  ];
}

function respiratoryTargetsFor(
  territoryName: string,
  infectionGroup: Exclude<InfectionGroup, "general">,
): Facility[] {
  if (BOROVICHI_RESPIRATORY_TERRITORIES.has(territoryName)) {
    return [LEGACY_FACILITIES.borovichi];
  }

  if (infectionGroup === "covid") return [LEGACY_FACILITIES.noib];

  if (STARAYA_RUSSA_RESPIRATORY_TERRITORIES.has(territoryName)) {
    return [LEGACY_FACILITIES.starayaRussa];
  }

  if (territoryName === "Валдайский район") return [LEGACY_FACILITIES.valdai];

  return [LEGACY_FACILITIES.noib, LEGACY_FACILITIES.cgkb];
}

function targetForRouteGroup(routeGroup: RouteGroup): Facility {
  if (routeGroup === "borovichi") return LEGACY_FACILITIES.borovichi;
  if (routeGroup === "staraya_russa") return LEGACY_FACILITIES.starayaRussa;
  if (routeGroup === "pestovo") return LEGACY_FACILITIES.pestovo;
  return LEGACY_FACILITIES.noib;
}

export function evaluateRoutingLegacy(state: FormState): RoutingResult | null {
  const territory = LEGACY_TERRITORIES.find((item) => item.name === state.territory);
  if (!territory || !state.infectionGroup || state.lifeThreats.length === 0) {
    return null;
  }

  const hasLifeThreat = state.lifeThreats.some((item) => item !== "none");
  const respiratoryTargets =
    state.infectionGroup === "general"
      ? undefined
      : respiratoryTargetsFor(territory.name, state.infectionGroup);

  if (hasLifeThreat) {
    const regionalReference =
      "приложение № 1, страницы 2–3: помощь при жизнеугрожающих состояниях оказывается в реанимационных отделениях медицинских организаций; после стабилизации предусмотрена эвакуация в ГОБУЗ «НОИБ»";
    const lifeThreatSources = sourcesFor(regionalReference);

    return {
      title: "Жизнеугрожающее инфекционное состояние",
      target: LEGACY_FACILITIES.unspecifiedIcu,
      targetLabel: "Первый этап маршрута",
      nextTarget:
        state.infectionGroup === "general" ? LEGACY_FACILITIES.noib : undefined,
      nextTargetLabel:
        state.infectionGroup === "general"
          ? "После стабилизации — медицинская эвакуация"
          : undefined,
      referenceTargets: respiratoryTargets,
      referenceTargetsLabel:
        respiratoryTargets && respiratoryTargets.length > 0
          ? "Стационар из сезонной схемы по диагнозу — справочно, не назначение конкретной ОАРИТ"
          : undefined,
      urgency: "Экстренно",
      transport:
        "В реанимационное отделение медицинской организации после оперативного подтверждения маршрута. Приказ № 302-Д не закрепляет конкретную ОАРИТ за выбранной территорией.",
      actions: [
        "Немедленно запросить у диспетчера конкретную медицинскую организацию с реанимационным отделением и подтвердить готовность приёма.",
        "Поддерживать жизненно важные функции и соблюдать санитарно-противоэпидемический режим.",
        state.infectionGroup === "general"
          ? "После стабилизации согласовать медицинскую эвакуацию в Новгородскую областную инфекционную больницу."
          : "После стабилизации повторно согласовать профильный маршрут с учётом сезонной схемы и готовности принимающего стационара.",
      ],
      handoff: [
        `Угрожающие состояния: ${state.lifeThreats
          .filter((item) => item !== "none")
          .map((item) => LEGACY_LIFE_THREAT_LABELS[item])
          .join(", ")}.`,
        "Показатели дыхания, гемодинамики, сознания и проведённые мероприятия.",
        "Предполагаемый инфекционный диагноз и эпидемиологический анамнез.",
      ],
      sources:
        state.infectionGroup === "general"
          ? lifeThreatSources
          : [
              lifeThreatSources[0],
              {
                ...SEASONAL_RESPIRATORY_ORDER,
                label: `${SEASONAL_RESPIRATORY_ORDER.label}; приложение № 4, страница 12: территориальная схема госпитализации взрослых по указанным диагнозам`,
              },
              ...lifeThreatSources.slice(1),
            ],
      warning:
        state.infectionGroup === "general"
          ? "Нормативный пробел: приказ № 302-Д не содержит таблицы «территория → конкретная ОАРИТ». Не подставляйте предполагаемую больницу без подтверждения диспетчера и принимающей организации."
          : "Нормативный пробел: приказ № 302-Д не содержит таблицы «территория → конкретная ОАРИТ». Указанные стационары сезонной схемы не следует автоматически считать назначенной ОАРИТ без подтверждения диспетчера и принимающей организации.",
    };
  }

  if (state.admissionCriteria.length === 0) return null;

  if (state.admissionCriteria.includes("none")) {
    return {
      title: "Стационарная маршрутизация не требуется",
      target: LEGACY_FACILITIES.outpatient,
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
      sources:
        state.infectionGroup === "general"
          ? sourcesFor(
              "приложение № 1, страница 2: лёгкое течение без показаний к стационарному лечению ведётся амбулаторно",
            )
          : seasonalSourcesFor(
              "приложение № 2, страница 9: перечень показаний для госпитализации взрослых",
            ),
    };
  }

  if (state.infectionGroup !== "general") {
    const targets = respiratoryTargets ?? [];
    const isCovid = state.infectionGroup === "covid";

    return {
      title: isCovid
        ? "Показана госпитализация по сезонной схеме COVID-19"
        : "Показана госпитализация по сезонной схеме гриппа, ОРВИ или внебольничной пневмонии",
      target: targets[0],
      targetLabel: "Куда госпитализировать по приказу № 920-Д",
      referenceTargets: targets.slice(1),
      referenceTargetsLabel: "Также указано в территориальной схеме",
      urgency: "По клиническим показаниям после согласования",
      transport:
        targets.length > 1
          ? "Приказ указывает несколько медицинских организаций; конкретную принимающую организацию и корпус необходимо подтвердить до транспортировки."
          : "В указанную медицинскую организацию после подтверждения приёма и конкретного принимающего корпуса.",
      actions: [
        "Сообщить диспетчеру выбранную территорию, предполагаемый диагноз и показания к госпитализации.",
        "Подтвердить конкретную принимающую организацию, корпус и въезд до начала транспортировки.",
        "Соблюдать санитарно-противоэпидемический режим во время транспортировки.",
      ],
      handoff: [
        `Группа инфекции: ${LEGACY_INFECTION_GROUP_LABELS[state.infectionGroup]}.`,
        `Показания к стационару: ${state.admissionCriteria
          .filter((item) => item !== "none")
          .map((item) => admissionLabelFor(item, state.infectionGroup))
          .join(", ")}.`,
        "Состояние в динамике, эпидемиологический анамнез и проведённые мероприятия.",
      ],
      sources: seasonalSourcesFor(
        "приложение № 4, страница 12: схема маршрутизации взрослого населения, подлежащего госпитализации",
      ),
      warning:
        "Приказ № 920-Д относится к эпидемическому сезону 2025–2026 годов. Перед применением необходимо убедиться, что он не заменён новой сезонной или оперативной схемой.",
    };
  }

  const hasSevereCourse = state.admissionCriteria.includes("severe");
  if (hasSevereCourse && state.transportable === undefined) return null;

  if (hasSevereCourse && state.transportable) {
    return {
      title: "Тяжёлое течение: прямой профильный маршрут",
      target: LEGACY_FACILITIES.noib,
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
    };
  }

  if (hasSevereCourse && state.transportable === false) {
    return {
      title: "Тяжёлое течение: пациент нетранспортабелен",
      target: LEGACY_FACILITIES.unspecifiedIcu,
      targetLabel: "Первый этап маршрута",
      nextTarget: LEGACY_FACILITIES.noib,
      nextTargetLabel: "После стабилизации — при подтверждённой транспортабельности",
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
    };
  }

  const target = targetForRouteGroup(territory.routeGroup);
  const direct = territory.routeGroup === "direct";

  return {
    title: direct
      ? "Показана госпитализация в областной инфекционный стационар"
      : "Показана госпитализация в территориальный инфекционный стационар",
    target,
    targetLabel: "Куда госпитализировать",
    nextTarget: direct ? undefined : LEGACY_FACILITIES.noib,
    nextTargetLabel: direct
      ? undefined
      : "Дальнейший профильный маршрут — при показаниях и согласовании",
    urgency: "По клиническим показаниям после согласования",
    transport:
      "Бригадой СМП после подтверждения готовности принимающей медицинской организации.",
    actions: [
      "Согласовать госпитализацию с принимающей медицинской организацией и диспетчером.",
      "Уточнить конкретный принимающий корпус и подъезд: приказ указывает организацию, но не адрес приёмного отделения.",
      "Соблюдать санитарно-противоэпидемический режим во время транспортировки.",
      ...(direct
        ? []
        : [
            "При необходимости помощи более высокого уровня согласовать перевод в Новгородскую областную инфекционную больницу.",
          ]),
    ],
    handoff: [
      `Показания к стационару: ${state.admissionCriteria
        .filter((item) => item !== "none")
        .map((item) => admissionLabelFor(item, state.infectionGroup))
        .join(", ")}.`,
      "Предполагаемый диагноз, дата начала заболевания и эпидемиологический анамнез.",
      "Состояние в динамике и проведённые мероприятия.",
    ],
    sources: sourcesFor(
      "приложение № 2, страница 4: схема территориальной маршрутизации взрослого населения с инфекционными заболеваниями",
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
    typeof value.address === "string" &&
    (value.url === undefined || typeof value.url === "string")
  );
}

function isFacilityArray(value: unknown): value is Facility[] {
  return Array.isArray(value) && value.every(isFacility);
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

function optionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function routingResultFromRules(value: unknown): RoutingResult {
  if (
    !isRecord(value) ||
    typeof value.title !== "string" ||
    !isFacility(value.target) ||
    typeof value.targetLabel !== "string" ||
    typeof value.urgency !== "string" ||
    typeof value.transport !== "string" ||
    !isStringArray(value.actions) ||
    !isStringArray(value.handoff) ||
    !isSourceArray(value.sources) ||
    (value.nextTarget !== undefined && !isFacility(value.nextTarget)) ||
    !optionalString(value.nextTargetLabel) ||
    (value.referenceTargets !== undefined &&
      !isFacilityArray(value.referenceTargets)) ||
    !optionalString(value.referenceTargetsLabel) ||
    !optionalString(value.warning)
  ) {
    throw new Error("rules_v1 вернул некорректный результат инфекционного профиля.");
  }
  return value as RoutingResult;
}

export function evaluateRoutingRulesV1(
  state: FormState,
): RoutingResult | null {
  return evaluateInfectiousRoutingRuleSet(INFECTIOUS_RULE_SET_V1, state);
}

export function evaluateInfectiousRoutingRuleSet(
  ruleSet: RoutingRuleSetV1,
  state: Record<string, unknown>,
): RoutingResult | null {
  const evaluation = evaluateRoutingRuleSetV1(ruleSet, state);
  return evaluation ? routingResultFromRules(evaluation.result) : null;
}

export function evaluateRouting(state: FormState): RoutingResult | null {
  return evaluateRoutingRulesV1(state);
}

export const infectiousRoutingProfile = {
  id: "infectious",
  title: "Инфекционные болезни",
  description: "Взрослые: территория → тяжесть → стационар и этап эвакуации",
  content: infectiousRoutingContent,
  evaluate: evaluateRouting,
} satisfies RoutingProfileDefinition<FormState, RoutingResult>;
