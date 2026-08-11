import { type ReactNode, useMemo, useState } from "react";

type AgeGroup = "child_0_15" | "age_16_17" | "adult_18_plus";
type LocationKind = "territory" | "m10" | "m11";
type M10Zone = "valdai_kresttsy" | "zaytsevo_novgorod_chudovo";
type M11Responder = "novgorod_smp" | "nokb_cmk" | "valdai_mmc";
type M11Zone = "570_474" | "474_389" | "570_389" | "389_444";
type InjuryCriterion =
  | "severe_tbi_or_shock"
  | "specialized_injury"
  | "other_without_shock"
  | "stable_isolated_limb"
  | "life_saving_10_20";

type FacilityId =
  | "nokb"
  | "odkb"
  | "cgkb1"
  | "borovichi"
  | "staraya_russa"
  | "valdai"
  | "kresttsy"
  | "chudovo"
  | "demyansk"
  | "zarubino"
  | "malaya_vishera"
  | "okulovka"
  | "pestovo"
  | "soltsy"
  | "khvoynaya";

type Facility = {
  id: FacilityId;
  name: string;
  level: "I" | "II" | "III";
  role: string;
  address: string;
};

type Territory = {
  name: string;
  level2: FacilityId;
  level3?: FacilityId;
};

type FormState = {
  ageGroup?: AgeGroup;
  locationKind?: LocationKind;
  territory?: string;
  m10Zone?: M10Zone;
  m11Responder?: M11Responder;
  m11Zone?: M11Zone;
  injuryCriterion?: InjuryCriterion;
};

type RoutingResult = {
  title: string;
  urgency: string;
  target: Facility;
  targetLabel: string;
  nextTarget?: Facility;
  nextTargetLabel?: string;
  rationale: string[];
  actions: string[];
  handoff: string[];
  warnings: string[];
  sourceReference: string;
};

const FACILITIES: Record<FacilityId, Facility> = {
  nokb: {
    id: "nokb",
    name: "ГОБУЗ «Новгородская областная клиническая больница»",
    level: "I",
    role: "Профильный центр для подростков старше 15 лет и взрослых",
    address: "Великий Новгород, ул. Павла Левитта, д. 14",
  },
  odkb: {
    id: "odkb",
    name: "ГОБУЗ «Областная детская клиническая больница»",
    level: "I",
    role: "Профильный детский центр для пациентов от 0 до 15 лет",
    address: "Великий Новгород, ул. Державина, д. 1",
  },
  cgkb1: {
    id: "cgkb1",
    name: "ГОБУЗ «Центральная городская клиническая больница», Клиника № 1",
    level: "II",
    role: "Новгородская зона ответственности",
    address: "Великий Новгород, ул. Зелинского, д. 11",
  },
  borovichi: {
    id: "borovichi",
    name: "ГОБУЗ «Боровичская центральная районная больница»",
    level: "II",
    role: "Боровичская зона ответственности",
    address: "г. Боровичи, пл. 1 Мая, д. 2А",
  },
  staraya_russa: {
    id: "staraya_russa",
    name: "ГОБУЗ «Старорусская центральная районная больница»",
    level: "II",
    role: "Старорусская зона ответственности",
    address: "г. Старая Русса, ул. Гостинодворская, д. 50",
  },
  valdai: {
    id: "valdai",
    name: "Валдайский ММЦ ФГБУ СЗОНКЦ им. Л. Г. Соколова ФМБА России",
    level: "II",
    role: "Валдайская зона; госпитализация по согласованию",
    address: "г. Валдай, ул. Песчаная, д. 1А",
  },
  kresttsy: {
    id: "kresttsy",
    name: "ГОБУЗ «Крестецкая центральная районная больница»",
    level: "III",
    role: "Только для предусмотренного приказом первого этапа",
    address: "р. п. Крестцы, ул. Гагарина, д. 2",
  },
  chudovo: {
    id: "chudovo",
    name: "ГОБУЗ «Чудовская центральная районная больница»",
    level: "III",
    role: "Только для предусмотренного приказом первого этапа",
    address: "г. Чудово, ул. Косинова, д. 6",
  },
  demyansk: {
    id: "demyansk",
    name: "ГОБУЗ «Демянская центральная районная больница»",
    level: "III",
    role: "Только для предусмотренного приказом первого этапа",
    address: "п. Демянск; принимающий корпус и въезд подтвердить диспетчером",
  },
  zarubino: {
    id: "zarubino",
    name: "ГОБУЗ «Зарубинская центральная районная больница»",
    level: "III",
    role: "Только для предусмотренного приказом первого этапа",
    address: "п. Зарубино; принимающий корпус и въезд подтвердить диспетчером",
  },
  malaya_vishera: {
    id: "malaya_vishera",
    name: "ГОБУЗ «Маловишерская центральная районная больница»",
    level: "III",
    role: "Только для предусмотренного приказом первого этапа",
    address: "г. Малая Вишера, 2-й Набережный пер., д. 20",
  },
  okulovka: {
    id: "okulovka",
    name: "ГОБУЗ «Окуловская центральная районная больница»",
    level: "III",
    role: "Только для предусмотренного приказом первого этапа",
    address: "г. Окуловка, ул. Калинина, д. 129",
  },
  pestovo: {
    id: "pestovo",
    name: "ГОБУЗ «Пестовская центральная районная больница»",
    level: "III",
    role: "Только для предусмотренного приказом первого этапа",
    address: "г. Пестово, ул. Курганная, д. 18",
  },
  soltsy: {
    id: "soltsy",
    name: "ГОБУЗ «Солецкая центральная районная больница»",
    level: "III",
    role: "Только для предусмотренного приказом первого этапа",
    address: "г. Сольцы; принимающий корпус и въезд подтвердить диспетчером",
  },
  khvoynaya: {
    id: "khvoynaya",
    name: "ГОБУЗ «Хвойнинская центральная районная больница»",
    level: "III",
    role: "Только для предусмотренного приказом первого этапа",
    address: "р. п. Хвойная; принимающий корпус и въезд подтвердить диспетчером",
  },
};

const TERRITORIES: Territory[] = [
  { name: "Великий Новгород", level2: "cgkb1" },
  { name: "Новгородский район", level2: "cgkb1" },
  { name: "Батецкий район", level2: "cgkb1" },
  { name: "Шимский район", level2: "cgkb1" },
  { name: "Маловишерский район", level2: "cgkb1", level3: "malaya_vishera" },
  { name: "Чудовский район", level2: "cgkb1", level3: "chudovo" },
  { name: "Солецкий округ", level2: "cgkb1", level3: "soltsy" },
  { name: "Боровичский район", level2: "borovichi" },
  { name: "Любытинский район", level2: "borovichi", level3: "zarubino" },
  { name: "Хвойнинский округ", level2: "borovichi", level3: "khvoynaya" },
  { name: "Пестовский район", level2: "borovichi", level3: "pestovo" },
  { name: "Мошенской район", level2: "borovichi" },
  { name: "Окуловский район", level2: "borovichi", level3: "okulovka" },
  { name: "Старорусский район", level2: "staraya_russa" },
  { name: "Парфинский район", level2: "staraya_russa" },
  { name: "Поддорский район", level2: "staraya_russa" },
  { name: "Холмский район", level2: "staraya_russa" },
  { name: "Волотовский округ", level2: "staraya_russa" },
  { name: "Валдайский район", level2: "valdai" },
  { name: "Крестецкий район", level2: "valdai", level3: "kresttsy" },
  { name: "Демянский район", level2: "valdai", level3: "demyansk" },
  { name: "Марёвский округ", level2: "valdai" },
];

const AGE_LABELS: Record<AgeGroup, string> = {
  child_0_15: "Ребёнок от 0 до 15 лет включительно",
  age_16_17: "Подросток 16–17 лет",
  adult_18_plus: "Взрослый, 18 лет и старше",
};

const INJURY_LABELS: Record<InjuryCriterion, string> = {
  severe_tbi_or_shock:
    "Тяжёлая ЧМТ, травматический шок или тяжёлая сочетанная/множественная травма",
  specialized_injury:
    "Повреждение позвоночника/спинного мозга, нервно-сосудистого пучка, лица/шеи, отрыв конечности, повреждение мочевых путей или внутренних органов",
  other_without_shock: "Другая травма без шока и без перечисленных признаков",
  stable_isolated_limb:
    "Изолированная травма конечности, гемодинамика стабильна, пациент транспортабелен",
  life_saving_10_20:
    "Нужна жизнеспасающая операция в ближайшие 10–20 минут, а немедленная доставка в травмоцентр I/II уровня невозможна",
};

const M11_RESPONDER_LABELS: Record<M11Responder, string> = {
  novgorod_smp: "ГОБУЗ «Новгородская станция скорой медицинской помощи»",
  nokb_cmk: "Центр медицины катастроф ГОБУЗ «НОКБ»",
  valdai_mmc: "Валдайский многопрофильный медицинский центр (по согласованию)",
};

const M11_ZONES: Record<M11Responder, Array<{ value: M11Zone; label: string }>> = {
  novgorod_smp: [
    { value: "570_474", label: "М-11: от 570-го до 474-го км" },
    { value: "474_389", label: "М-11: от 474-го до 389-го км" },
  ],
  nokb_cmk: [{ value: "570_389", label: "М-11: от 570-го до 389-го км" }],
  valdai_mmc: [{ value: "389_444", label: "М-11: от 389-го до 444-го км" }],
};

const REGIONAL_SOURCE =
  "Приказ Министерства здравоохранения Новгородской области от 21.11.2023 № 1360-Д «Об организации оказания медицинской помощи пострадавшим при дорожно-транспортных происшествиях, произошедших на территории Новгородской области»";

function adultLevelOne(ageGroup: AgeGroup): Facility {
  return ageGroup === "child_0_15" ? FACILITIES.odkb : FACILITIES.nokb;
}

function levelTwoForTerritory(territory: Territory, ageGroup: AgeGroup): Facility {
  if (territory.level2 === "valdai") {
    if (ageGroup === "child_0_15") return FACILITIES.odkb;
    if (ageGroup === "age_16_17") return FACILITIES.nokb;
  }
  return FACILITIES[territory.level2];
}

function commonHandoff(state: FormState): string[] {
  return [
    `Возрастная группа: ${state.ageGroup ? AGE_LABELS[state.ageGroup] : "не указана"}.`,
    `Характер травмы: ${state.injuryCriterion ? INJURY_LABELS[state.injuryCriterion] : "не указан"}.`,
    "Показатели сознания, дыхания и гемодинамики; признаки ЧМТ и шока в динамике.",
    "Механизм травмы, время ДТП, выявленные повреждения и выполненные мероприятия.",
  ];
}

function evaluateM11(state: FormState): RoutingResult | null {
  if (
    !state.ageGroup ||
    !state.injuryCriterion ||
    !state.m11Responder ||
    !state.m11Zone
  ) {
    return null;
  }

  const severe = state.injuryCriterion === "severe_tbi_or_shock";
  let target: Facility;

  if (state.m11Responder === "nokb_cmk") {
    target = adultLevelOne(state.ageGroup);
  } else if (
    state.m11Responder === "novgorod_smp" &&
    state.m11Zone === "570_474"
  ) {
    target = adultLevelOne(state.ageGroup);
  } else if (
    state.m11Responder === "novgorod_smp" &&
    state.m11Zone === "474_389"
  ) {
    target = state.ageGroup === "child_0_15" && severe
      ? FACILITIES.odkb
      : FACILITIES.borovichi;
  } else {
    target = state.ageGroup === "child_0_15"
      ? severe
        ? FACILITIES.odkb
        : FACILITIES.borovichi
      : FACILITIES.valdai;
  }

  return {
    title: "Маршрут по специальной таблице для М-11 «Нева»",
    urgency: "Экстренно, с уведомлением принимающего травмоцентра",
    target,
    targetLabel: "Место госпитализации",
    rationale: [
      `Ответственная организация: ${M11_RESPONDER_LABELS[state.m11Responder]}.`,
      `Зона: ${M11_ZONES[state.m11Responder].find((zone) => zone.value === state.m11Zone)?.label ?? state.m11Zone}.`,
      severe
        ? "Выбрано наличие тяжёлой ЧМТ и/или травматического шока."
        : "Тяжёлая ЧМТ и травматический шок не выбраны.",
    ],
    actions: [
      "Немедленно уведомить выбранный травмоцентр и подтвердить готовность приёма.",
      "При чрезвычайной ситуации или крупном ДТП обеспечить взаимодействие с Центром медицины катастроф, включая возможность авиационной эвакуации.",
      "Поддерживать жизненно важные функции во время транспортировки.",
    ],
    handoff: commonHandoff(state),
    warnings:
      state.m11Responder === "valdai_mmc" && state.ageGroup === "age_16_17"
        ? [
            "Требуется верификация Минздрава: приложение № 6 направляет в Валдайский ММЦ подростков старше 15 лет, тогда как приложение № 7 содержит пометку о ВММЦ «только с 18 лет».",
          ]
        : [],
    sourceReference: `${REGIONAL_SOURCE}; приложение № 6, страницы 12–13.`,
  };
}

function evaluateM10(state: FormState): RoutingResult | null {
  if (!state.ageGroup || !state.injuryCriterion || !state.m10Zone) return null;

  const child = state.ageGroup === "child_0_15";
  const needsHigherLevel =
    state.injuryCriterion === "severe_tbi_or_shock" ||
    state.injuryCriterion === "specialized_injury";
  const target = child
    ? FACILITIES.odkb
    : state.m10Zone === "valdai_kresttsy" && state.ageGroup === "adult_18_plus"
      ? FACILITIES.valdai
      : state.m10Zone === "zaytsevo_novgorod_chudovo" && !needsHigherLevel
        ? FACILITIES.cgkb1
        : FACILITIES.nokb;

  return {
    title: "Маршрут по зоне ответственности М-10 «Россия»",
    urgency: "Экстренно",
    target,
    targetLabel: "Профильный травмоцентр",
    rationale: [
      state.m10Zone === "valdai_kresttsy"
        ? "Участок Валдайского района и Крестецкого района до населённого пункта Зайцево относится к Валдайской зоне."
        : "Участок от населённого пункта Зайцево через Новгородский и Чудовский районы относится к Новгородской зоне.",
      child
        ? "Для ребёнка 0–15 лет приоритетным травмоцентром I уровня является Областная детская клиническая больница."
        : "Маршрут выбран с учётом взрослой возрастной группы и зоны федеральной трассы.",
    ],
    actions: [
      "Уведомить принимающий травмоцентр и подтвердить маршрут через диспетчера.",
      "Оценить минимальную транспортную доступность и необходимость специализированной реанимационной бригады класса C.",
      "При ухудшении состояния повторно согласовать этапность медицинской эвакуации.",
    ],
    handoff: commonHandoff(state),
    warnings:
      [
        ...(state.m10Zone === "valdai_kresttsy" && state.ageGroup === "age_16_17"
          ? [
              "Валдайский ММЦ в общей таблице приложения № 7 указан для пациентов с 18 лет; для возраста 16–17 лет показан маршрут в НОКБ.",
            ]
          : []),
        ...(state.injuryCriterion === "life_saving_10_20"
          ? [
              "Для операции в течение 10–20 минут одного выбора зоны М-10 недостаточно: конкретный ближайший травмоцентр III уровня или операционную необходимо определить диспетчеру по точке ДТП и времени доезда.",
            ]
          : []),
      ],
    sourceReference: `${REGIONAL_SOURCE}; приложения № 5 и № 7, страницы 11 и 14–17.`,
  };
}

function evaluateTerritory(state: FormState): RoutingResult | null {
  if (!state.ageGroup || !state.injuryCriterion || !state.territory) return null;
  const territory = TERRITORIES.find((item) => item.name === state.territory);
  if (!territory) return null;

  const levelOne = adultLevelOne(state.ageGroup);
  const levelTwo = levelTwoForTerritory(territory, state.ageGroup);
  const localLevelThree = territory.level3
    ? FACILITIES[territory.level3]
    : undefined;

  if (
    (state.injuryCriterion === "life_saving_10_20" ||
      state.injuryCriterion === "stable_isolated_limb") &&
    localLevelThree
  ) {
    return {
      title: "Этапный маршрут через травмоцентр III уровня",
      urgency:
        state.injuryCriterion === "life_saving_10_20"
          ? "Немедленно"
          : "Экстренно",
      target: localLevelThree,
      targetLabel: "Первый этап",
      nextTarget: levelTwo,
      nextTargetLabel: "После стабилизации — травмоцентр II уровня своей зоны",
      rationale: [
        state.injuryCriterion === "life_saving_10_20"
          ? "Травмоцентр III уровня допускается, когда требуется жизнеспасающая операция в течение 10–20 минут и немедленная доставка в центр I/II уровня невозможна."
          : "Травмоцентр III уровня может принять стабильного пациента с изолированной травмой конечности.",
        "При наличии показаний дальнейший перевод выполняется в травмоцентр более высокого уровня.",
      ],
      actions: [
        "Подтвердить готовность травмоцентра III уровня и одновременно уведомить травмоцентр II уровня своей зоны.",
        "После устранения непосредственной угрозы согласовать перевод; оптимально — в первые 24 часа с момента доставки в стационар.",
        "Для межбольничной эвакуации тяжёлого пациента использовать реанимационную бригаду и автомобиль класса C.",
      ],
      handoff: commonHandoff(state),
      warnings: [
        "Травмоцентр III уровня не является обычным конечным пунктом для тяжёлой сочетанной или множественной травмы.",
      ],
      sourceReference: `${REGIONAL_SOURCE}; приложения № 4, № 7 и № 8, страницы 10 и 14–18.`,
    };
  }

  if (state.injuryCriterion === "life_saving_10_20" && !localLevelThree) {
    return {
      title: "Нужна немедленная жизнеспасающая помощь",
      urgency: "Немедленно",
      target: levelTwo,
      targetLabel: "Ближайший закреплённый травмоцентр II уровня",
      nextTarget: levelOne,
      nextTargetLabel: "Травмоцентр I уровня — при показаниях после стабилизации",
      rationale: [
        "Для выбранной территории приказ не показывает отдельный травмоцентр III уровня в приложении № 4.",
        "Конкретную ближайшую точку для операции в течение 10–20 минут необходимо подтвердить диспетчером.",
      ],
      actions: [
        "Немедленно согласовать ближайшую доступную операционную и готовность травматологической/хирургической бригады.",
        "Одновременно уведомить травмоцентр более высокого уровня о вероятной последующей эвакуации.",
      ],
      handoff: commonHandoff(state),
      warnings: [
        "Нормативный пробел для интерфейса: приказ не содержит оперативной таблицы доступности операционных и времени доезда.",
      ],
      sourceReference: `${REGIONAL_SOURCE}; приложения № 4 и № 7, страницы 10 и 14–17.`,
    };
  }

  const childHighRisk =
    state.ageGroup === "child_0_15" &&
    (state.injuryCriterion === "severe_tbi_or_shock" ||
      state.injuryCriterion === "specialized_injury");

  const target = childHighRisk ? FACILITIES.odkb : levelTwo;
  const needsHigherLevel =
    state.injuryCriterion === "severe_tbi_or_shock" ||
    state.injuryCriterion === "specialized_injury";
  const nextTarget = target.id === levelOne.id || !needsHigherLevel
    ? undefined
    : levelOne;

  return {
    title: childHighRisk
      ? "Прямая детская маршрутизация в травмоцентр I уровня"
      : "Маршрут в травмоцентр закреплённой зоны",
    urgency: "Экстренно",
    target,
    targetLabel: "Первичное место госпитализации",
    nextTarget,
    nextTargetLabel: nextTarget
      ? "Травмоцентр I уровня — при показаниях к медицинской эвакуации"
      : undefined,
    rationale: [
      childHighRisk
        ? "Ребёнок 0–15 лет с тяжёлой или требующей специализированной помощи травмой направляется в Областную детскую клиническую больницу."
        : `По территориальной схеме первый профильный центр — ${levelTwo.name}.`,
      needsHigherLevel
        ? "Выбранная травма относится к группе, для которой необходимо раннее уведомление травмоцентра более высокого уровня."
        : "Признаки шока и повреждения, требующие центра более высокого уровня, не выбраны.",
    ],
    actions: [
      "Уведомить принимающий травмоцентр и подтвердить готовность приёма.",
      ...(needsHigherLevel
        ? [
            "Передать сведения в травмоцентр I уровня и согласовать необходимость прямой доставки либо последующего перевода.",
            "При межбольничной эвакуации тяжёлого пациента использовать реанимационную бригаду и автомобиль класса C.",
          ]
        : []),
      "Выбор между центрами I и II уровня уточняется по тяжести, профилю повреждений и минимальной транспортной доступности.",
    ],
    handoff: commonHandoff(state),
    warnings: [
      "Немедленная межбольничная транспортировка противопоказана при нестабильной гемодинамике и признаках нарастания отёка/дислокации головного мозга — сначала требуется стабилизация.",
    ],
    sourceReference: `${REGIONAL_SOURCE}; приложения № 7–9, страницы 14–20.`,
  };
}

function evaluateRouting(state: FormState): RoutingResult | null {
  if (!state.locationKind) return null;
  if (state.locationKind === "m11") return evaluateM11(state);
  if (state.locationKind === "m10") return evaluateM10(state);
  return evaluateTerritory(state);
}

function Section(props: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-bold">{props.title}</h2>
      {props.children}
    </section>
  );
}

function ChoiceButton(props: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`w-full rounded-2xl border p-3 text-left transition ${
        props.selected
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-200 bg-white hover:bg-neutral-50"
      }`}
    >
      {props.children}
    </button>
  );
}

function FacilityCard(props: { facility: Facility; label: string }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
        {props.label}
      </div>
      <div className="mt-1 font-bold">{props.facility.name}</div>
      <div className="mt-1 text-sm text-neutral-700">
        Травмоцентр {props.facility.level} уровня. {props.facility.role}
      </div>
      <div className="mt-2 text-sm font-medium">{props.facility.address}</div>
    </div>
  );
}

function ListBlock(props: { title: string; items: string[] }) {
  if (props.items.length === 0) return null;
  return (
    <div>
      <div className="mb-1 text-sm font-semibold">{props.title}</div>
      <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">
        {props.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function RoadAccidentSMPRoutingWizard() {
  const [state, setState] = useState<FormState>({});
  const result = useMemo(() => evaluateRouting(state), [state]);

  const availableM11Zones = state.m11Responder
    ? M11_ZONES[state.m11Responder]
    : [];

  return (
    <div className="min-h-screen bg-neutral-50 p-4">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">
            ДТП и травма — маршрутизация пострадавших СМП
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Место ДТП, возраст и характер травмы → травмоцентр соответствующего уровня и этап медицинской эвакуации.
          </p>
        </header>

        <div className="rounded-3xl border-2 border-violet-300 bg-violet-50 p-5 text-violet-950">
          <div className="text-sm font-bold uppercase tracking-wide text-violet-800">
            Вопросы для верификации куратором Минздрава
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            <li>
              Предоставить действующую редакцию связанного приказа № 1359-Д от 21.11.2023 и подтвердить, что приказ № 1360-Д не заменён.
            </li>
            <li>
              Уточнить возраст для Валдайского ММЦ: приложение № 6 по М-11 включает подростков старше 15 лет, приложение № 7 содержит ограничение «только с 18 лет».
            </li>
            <li>
              Подтвердить адреса принимающих отделений, телефоны согласования, резервные травмоцентры и порядок переключения при недоступности стационара.
            </li>
          </ul>
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <Section title="1. Место дорожно-транспортного происшествия">
              <div className="space-y-2">
                <ChoiceButton
                  selected={state.locationKind === "territory"}
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      locationKind: "territory",
                      m10Zone: undefined,
                      m11Responder: undefined,
                      m11Zone: undefined,
                    }))
                  }
                >
                  <span className="font-medium">Муниципальная территория или другая дорога</span>
                </ChoiceButton>
                <ChoiceButton
                  selected={state.locationKind === "m10"}
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      locationKind: "m10",
                      territory: undefined,
                      m11Responder: undefined,
                      m11Zone: undefined,
                    }))
                  }
                >
                  <span className="font-medium">Федеральная дорога М-10 «Россия»</span>
                </ChoiceButton>
                <ChoiceButton
                  selected={state.locationKind === "m11"}
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      locationKind: "m11",
                      territory: undefined,
                      m10Zone: undefined,
                    }))
                  }
                >
                  <span className="font-medium">Федеральная дорога М-11 «Нева»</span>
                </ChoiceButton>
              </div>

              {state.locationKind === "territory" ? (
                <div className="mt-4">
                  <label className="mb-1 block text-sm font-medium" htmlFor="dtp-territory">
                    Район или округ
                  </label>
                  <select
                    id="dtp-territory"
                    className="w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2"
                    value={state.territory ?? ""}
                    onChange={(event) => {
                      const territory = event.currentTarget.value;
                      setState((current) => ({
                        ...current,
                        territory: territory || undefined,
                      }));
                    }}
                  >
                    <option value="">Выберите территорию</option>
                    {TERRITORIES.map((territory) => (
                      <option key={territory.name} value={territory.name}>
                        {territory.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {state.locationKind === "m10" ? (
                <div className="mt-4 space-y-2">
                  <ChoiceButton
                    selected={state.m10Zone === "valdai_kresttsy"}
                    onClick={() =>
                      setState((current) => ({ ...current, m10Zone: "valdai_kresttsy" }))
                    }
                  >
                    <span className="font-medium">Валдайский район и Крестецкий район до н. п. Зайцево</span>
                  </ChoiceButton>
                  <ChoiceButton
                    selected={state.m10Zone === "zaytsevo_novgorod_chudovo"}
                    onClick={() =>
                      setState((current) => ({ ...current, m10Zone: "zaytsevo_novgorod_chudovo" }))
                    }
                  >
                    <span className="font-medium">От н. п. Зайцево через Новгородский и Чудовский районы</span>
                  </ChoiceButton>
                </div>
              ) : null}

              {state.locationKind === "m11" ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium" htmlFor="dtp-m11-responder">
                      Ответственная организация/бригада
                    </label>
                    <select
                      id="dtp-m11-responder"
                      className="w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2"
                      value={state.m11Responder ?? ""}
                      onChange={(event) => {
                        const responder = event.currentTarget.value as M11Responder | "";
                        const zones = responder ? M11_ZONES[responder] : [];
                        setState((current) => ({
                          ...current,
                          m11Responder: responder || undefined,
                          m11Zone: zones.length === 1 ? zones[0].value : undefined,
                        }));
                      }}
                    >
                      <option value="">Выберите организацию</option>
                      {(Object.keys(M11_RESPONDER_LABELS) as M11Responder[]).map((responder) => (
                        <option key={responder} value={responder}>
                          {M11_RESPONDER_LABELS[responder]}
                        </option>
                      ))}
                    </select>
                  </div>
                  {availableM11Zones.length > 0 ? (
                    <div>
                      <label className="mb-1 block text-sm font-medium" htmlFor="dtp-m11-zone">
                        Километровый участок
                      </label>
                      <select
                        id="dtp-m11-zone"
                        className="w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2"
                        value={state.m11Zone ?? ""}
                        onChange={(event) => {
                          const zone = event.currentTarget.value as M11Zone | "";
                          setState((current) => ({
                            ...current,
                            m11Zone: zone || undefined,
                          }));
                        }}
                      >
                        <option value="">Выберите участок</option>
                        {availableM11Zones.map((zone) => (
                          <option key={zone.value} value={zone.value}>
                            {zone.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Section>

            <Section title="2. Возраст пострадавшего">
              <div className="space-y-2">
                {(Object.keys(AGE_LABELS) as AgeGroup[]).map((ageGroup) => (
                  <ChoiceButton
                    key={ageGroup}
                    selected={state.ageGroup === ageGroup}
                    onClick={() => setState((current) => ({ ...current, ageGroup }))}
                  >
                    <span className="font-medium">{AGE_LABELS[ageGroup]}</span>
                  </ChoiceButton>
                ))}
              </div>
            </Section>

            <Section title="3. Ведущий критерий маршрутизации">
              <p className="mb-3 text-sm text-neutral-600">
                Выберите наиболее тяжёлый или наиболее срочный из выявленных критериев.
              </p>
              <div className="space-y-2">
                {(Object.keys(INJURY_LABELS) as InjuryCriterion[]).map((criterion) => (
                  <ChoiceButton
                    key={criterion}
                    selected={state.injuryCriterion === criterion}
                    onClick={() =>
                      setState((current) => ({ ...current, injuryCriterion: criterion }))
                    }
                  >
                    <span className="font-medium">{INJURY_LABELS[criterion]}</span>
                  </ChoiceButton>
                ))}
              </div>
            </Section>
          </div>

          <Section title="Итог маршрутизации">
            {!result ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Укажите место ДТП, возраст пострадавшего и ведущий критерий травмы. Для М-11 дополнительно выберите ответственную организацию и километровый участок.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-xl font-bold">{result.title}</div>
                  <div className="mt-1 text-sm text-neutral-600">
                    Срочность: {result.urgency}
                  </div>
                </div>

                <FacilityCard facility={result.target} label={result.targetLabel} />
                {result.nextTarget && result.nextTargetLabel ? (
                  <FacilityCard facility={result.nextTarget} label={result.nextTargetLabel} />
                ) : null}

                <ListBlock title="Почему выбран этот маршрут" items={result.rationale} />
                <ListBlock title="Действия СМП" items={result.actions} />
                <ListBlock title="Что передать принимающей стороне" items={result.handoff} />

                {result.warnings.map((warning) => (
                  <div
                    key={warning}
                    className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
                  >
                    {warning}
                  </div>
                ))}

                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="mb-1 text-sm font-semibold">Нормативный источник</div>
                  <div className="text-sm text-neutral-700">{result.sourceReference}</div>
                </div>
              </div>
            )}
          </Section>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950">
          Система показывает нормативный маршрут, но не знает текущую загрузку травмоцентров, состояние дорог и готовность принимающей бригады. Перед выездом маршрут, принимающее отделение, адрес въезда и необходимость специализированной эвакуации обязательно подтверждаются диспетчером и принимающей медицинской организацией.
        </div>
      </div>
    </div>
  );
}
