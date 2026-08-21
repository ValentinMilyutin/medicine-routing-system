import type { RoutingProfileDefinition } from "./types.js";
import { obstetricsRoutingContent } from "./content-manifests.js";
import {
  OBSTETRICS_RULE_SET_V1,
  OBSTETRICS_TERRITORIES_BOROVICHI_V1,
  OBSTETRICS_TERRITORIES_NOVGOROD_V1,
  OBSTETRICS_TERRITORIES_STARAYA_RUSSA_V1,
  OBSTETRICS_TERRITORIES_VALDAI_V1,
} from "./obstetrics-rules-v1.js";
import { evaluateRoutingRuleSetV1 } from "./rules-v1.js";
import { prepareRoutingEvaluationState } from "./evaluation-state.js";

export type Scenario = "gyne_lt37" | "obstetrics_ge37" | "postpartum_le42";
export type InfectionType = "none" | "arvi_pneumo" | "flu_covid";
export type RiskGroup = "low" | "mid" | "high";

type TerritoryGroup = "borovichi" | "staraya_russa" | "valdai" | "novgorod" | "unknown";

export type CriticalKind =
  | "bleeding"
  | "preeclampsia_eclampsia"
  | "sepsis_shock"
  | "resp_failure"
  | "teo_cardiac"
  | "other";

export type CriticalRoute = "kas_arkc" | "profile_nokb";

export type PostpartumIssue =
  | "bleeding"
  | "sepsis_fever"
  | "seizures_hypertensive"
  | "resp_failure"
  | "teo_cardiac"
  | "postop_pain_other";

export type SurgeryProfile = "city" | "regional";

type Lpu = { id: string; name: string; address: string; notes?: string };

export type FormState = {
  scenario?: Scenario;

  territory?: string;

  // triage / severity
  critical?: boolean;
  criticalKind?: CriticalKind;
  criticalRoute?: CriticalRoute;

  infectionType?: InfectionType;
  infectionSevere?: boolean;
  infectionOver7Days?: boolean;

  trauma?: boolean;
  traumaSevere?: boolean;

  surgery?: boolean;
  surgeryLifeThreat?: boolean;
  surgeryProfile?: SurgeryProfile;

  extragenitalInpatient?: boolean;

  // ordinary
  pretermLabor?: boolean;
  canDeliverToNokpc?: boolean;
  riskDelivery?: RiskGroup;

  postpartumIssue?: PostpartumIssue;
};

export type RoutingResult = {
  target: Lpu;
  alternative?: Lpu;
  transport: string;
  callouts: string[];
  sources: string[];
};

const LPU = {
  NOKB: { id: "nokb", name: "ГОБУЗ «Новгородская областная клиническая больница» (НОКБ)", address: "Великий Новгород, ул. Павла Левитта, д. 14" } as Lpu,
  NOKPC: {
    id: "nokpc",
    name: "ГОБУЗ «НОКПЦ имени В.Ю. Мишекурина» (НОКПЦ)",
    address: "Великий Новгород, ул. Державина, д. 1",
    notes: "АРКЦ/перинатальный центр",
  } as Lpu,
  NOIB: { id: "noib", name: "ГОБУЗ «Новгородская областная инфекционная больница»", address: "Великий Новгород, ул. Тимура Фрунзе-Оловянка, д. 21" } as Lpu,
  CGKB: { id: "cgkb", name: "ГОБУЗ «Центральная городская клиническая больница» (ЦГКБ)", address: "Великий Новгород, ул. Зелинского, д. 11" } as Lpu,
  BOR: { id: "bor", name: "ГОБУЗ «Боровичская ЦРБ» (Боровичи)", address: "Боровичи, пл. 1 Мая, д. 2А" } as Lpu,
  PESTO: { id: "pesto", name: "ГОБУЗ «Пестовская ЦРБ» (Пестово)", address: "Пестово, ул. Курганная, д. 18" } as Lpu,
  STAR: { id: "star", name: "ГОБУЗ «Старорусская ЦРБ» (Старая Русса)", address: "Старая Русса, ул. Гостинодворская, д. 50" } as Lpu,
  VALDAI: {
    id: "valdai",
    name: "Валдайский ММЦ ФГБУ «СЗОНКЦ им. Л.Г. Соколова» ФМБА России",
    address: "Валдай, ул. Песчаная, д. 1А",
    notes: "по согласованию",
  } as Lpu,
};

// Акушерские/общие территориальные группы для override-веток
const LEGACY_TERRITORIES_BOROVICHI = [
  "Боровичи",
  "Боровичский район",
  "Любытинский",
  "Хвойнинский",
  "Пестовский",
  "Мошенской",
  "Окуловский",
];

const LEGACY_TERRITORIES_STARAYA_RUSSA = [
  "Старая Русса",
  "Старорусский",
  "Парфинский",
  "Поддорский",
  "Холмский",
  "Волотовский",
];

const LEGACY_TERRITORIES_VALDAI = [
  "Валдайский",
  "Крестецкий",
  "Демянский",
  "Марёвский",
];

const LEGACY_TERRITORIES_NOVGOROD = [
  "Великий Новгород",
  "Новгородский район",
  "Батецкий",
  "Шимский",
  "Маловишерский",
  "Чудовский",
  "Солецкий",
];

export const TERRITORIES_BOROVICHI =
  OBSTETRICS_TERRITORIES_BOROVICHI_V1;
export const TERRITORIES_STARAYA_RUSSA =
  OBSTETRICS_TERRITORIES_STARAYA_RUSSA_V1;
export const TERRITORIES_VALDAI = OBSTETRICS_TERRITORIES_VALDAI_V1;
export const TERRITORIES_NOVGOROD = OBSTETRICS_TERRITORIES_NOVGOROD_V1;

// Гинекология (<37): экстренная госпитализация по 792-Д
const GYN_LT37_CGKB = [
  "Великий Новгород",
  "Батецкий",
  "Новгородский район",
  "Чудовский",
  "Маловишерский",
  "Мошенской",
  "Мошенской район",
];

const GYN_LT37_VALDAI = ["Валдайский", "Крестецкий", "Демянский", "Марёвский"];

const GYN_LT37_BOR = [
  "Боровичи",
  "Боровичский район",
  "Любытинский",
  "Хвойнинский",
  "Окуловский",
];

const GYN_LT37_PESTO = ["Пестовский"];

const GYN_LT37_STAR = [
  "Старая Русса",
  "Старорусский",
  "Парфинский",
  "Поддорский",
  "Холмский",
  "Волотовский",
  "Солецкий",
  "Шимский",
];

export function groupOfTerritory(t?: string): TerritoryGroup {
  if (!t) return "unknown";
  if (LEGACY_TERRITORIES_BOROVICHI.includes(t)) return "borovichi";
  if (LEGACY_TERRITORIES_STARAYA_RUSSA.includes(t)) return "staraya_russa";
  if (LEGACY_TERRITORIES_VALDAI.includes(t)) return "valdai";
  if (LEGACY_TERRITORIES_NOVGOROD.includes(t)) return "novgorod";
  return "unknown";
}

export function isGyneScenario(s: FormState): boolean {
  return s.scenario === "gyne_lt37";
}

export function isObstetricsScenario(s: FormState): boolean {
  return s.scenario === "obstetrics_ge37";
}

export function isPostpartumScenario(s: FormState): boolean {
  return s.scenario === "postpartum_le42";
}

function gynLt37EmergencyTargetByTerritory(t?: string): Lpu {
  if (!t) return LPU.CGKB;
  if (GYN_LT37_CGKB.includes(t)) return LPU.CGKB;
  if (GYN_LT37_VALDAI.includes(t)) return LPU.VALDAI;
  if (GYN_LT37_BOR.includes(t)) return LPU.BOR;
  if (GYN_LT37_PESTO.includes(t)) return LPU.PESTO;
  if (GYN_LT37_STAR.includes(t)) return LPU.STAR;
  return LPU.CGKB;
}

function nearestByTerritory(tg: TerritoryGroup): Lpu {
  return tg === "borovichi"
    ? LPU.BOR
    : tg === "staraya_russa"
    ? LPU.STAR
    : tg === "valdai"
    ? LPU.VALDAI
    : LPU.CGKB;
}

function traumaIcuTargetByTerritory(t?: string): Lpu {
  if (!t) return LPU.CGKB;

  if (t === "Пестовский" || t === "Пестово") return LPU.PESTO;

  const tg = groupOfTerritory(t);
  if (tg === "borovichi") return LPU.BOR;
  if (tg === "staraya_russa") return LPU.STAR;
  if (tg === "valdai") return LPU.VALDAI;

  return LPU.CGKB;
}

type Branch = "infection" | "trauma" | "surgery" | "extragenital" | "critical" | "ordinary";

export function deriveBranch(s: FormState): Branch {
  if (s.infectionType && s.infectionType !== "none") return "infection";
  if (s.trauma) return "trauma";
  if (s.surgery) return "surgery";
  if (s.extragenitalInpatient) return "extragenital";
  if (s.critical) return "critical";
  return "ordinary";
}

function routeCriticalObstetricLike(s: FormState): RoutingResult {
  const route: CriticalRoute = s.criticalRoute ?? "kas_arkc";
  const target = route === "kas_arkc" ? LPU.NOKPC : LPU.NOKB;

  return {
    target,
    transport:
      route === "kas_arkc"
        ? "СМП (экстренно) + уведомление/вызов АРКЦ НОКПЦ (выездная анестезиолого-реанимационная акушерская бригада при необходимости)"
        : "СМП (экстренно) в профильный стационар",
    callouts: [
      s.criticalKind ? `Критическое состояние: ${labelCriticalKind(s.criticalKind)}` : "Критическое состояние: да",
      route === "kas_arkc" ? "Маршрут: Критическое акшерское состояние (КАС) → НОКПЦ (АРКЦ)" : "Маршрут: профильная/общесоматическая критика → НОКБ",
    ],
    sources: [
      route === "kas_arkc"
        ? "Прил. 5: неотложные состояния (АРКЦ НОКПЦ)"
        : "Схема: профильная/общесоматическая критика → НОКБ",
    ],
  };
}

function routeGyneLt37(s: FormState): RoutingResult | null {
  if (!s.territory) return null;

  if (s.extragenitalInpatient) {
    return {
      target: LPU.NOKB,
      transport: "СМП (экстренно)",
      callouts: [
        "Профиль: гинекология (<37 недель)",
        "Тяжёлая экстрагенитальная патология → НОКБ",
      ],
      sources: ["Приказ 792-Д: столбец «Госпитализация пациенток с тяжёлой экстрагенитальной патологией» → НОКБ"],
    };
  }

  const target = gynLt37EmergencyTargetByTerritory(s.territory);

  return {
    target,
    transport: target.id === LPU.VALDAI.id ? "СМП (экстренно, по согласованию)" : "СМП (экстренно)",
    callouts: [
      "Профиль: гинекология (<37 недель)",
      s.critical
        ? "Критическое/срочное состояние → экстренная госпитализация по территории"
        : "Экстренная госпитализация по территории",
    ],
    sources: ["Приказ 792-Д: столбец «Экстренная госпитализация»"],
  };
}

function routeObstetrics(s: FormState): RoutingResult | null {
  if (!s.territory) return null;

  const tg = groupOfTerritory(s.territory);

  if (s.critical) {
    return routeCriticalObstetricLike(s);
  }

  if (s.pretermLabor) {
    const can = s.canDeliverToNokpc ?? true;
    if (can) {
      return {
        target: LPU.NOKPC,
        transport: "СМП (экстренно/неотложно)",
        callouts: ["Подозрение на преждевременные роды", "Цель: НОКПЦ"],
        sources: ["Преждевременные роды → НОКПЦ"],
      };
    }

    const target = nearestByTerritory(tg);
    return {
      target,
      alternative: LPU.NOKPC,
      transport: target.id === LPU.VALDAI.id ? "СМП (по согласованию)" : "СМП",
      callouts: [
        "Подозрение на преждевременные роды",
        "Доставка в НОКПЦ невозможна → ближайший стационар",
        "Параллельно: уведомление/вызов АРКЦ НОКПЦ при необходимости",
      ],
      sources: ["MVP: запасной вариант при невозможности доставки в НОКПЦ"],
    };
  }

  if (!s.riskDelivery) return null;

  if (s.riskDelivery === "mid" || s.riskDelivery === "high") {
    return {
      target: LPU.NOKPC,
      transport: "СМП",
      callouts: [`Акушерство: риск ${labelRisk(s.riskDelivery)} → НОКПЦ`],
      sources: ["Прил.2: средний/высокий риск → НОКПЦ"],
    };
  }

  const target =
    tg === "borovichi"
      ? LPU.BOR
      : tg === "valdai"
      ? LPU.VALDAI
      : tg === "staraya_russa"
      ? LPU.STAR
      : LPU.NOKPC;

  const alternative = target.id === LPU.VALDAI.id ? LPU.NOKPC : undefined;

  return {
    target,
    alternative,
    transport: target.id === LPU.VALDAI.id ? "СМП (по согласованию)" : "СМП",
    callouts: ["Акушерство: низкий риск → по территории"],
    sources: ["Конспект: низкий риск (территории → НОКПЦ/Боровичи/Валдайский ММЦ)"],
  };
}

function routePostpartum(s: FormState): RoutingResult | null {
  const tg = groupOfTerritory(s.territory);

  if (s.critical) {
    return routeCriticalObstetricLike(s);
  }

  if (!s.postpartumIssue) return null;

  const criticalLike: PostpartumIssue[] = [
    "bleeding",
    "sepsis_fever",
    "seizures_hypertensive",
    "resp_failure",
    "teo_cardiac",
  ];

  if (criticalLike.includes(s.postpartumIssue)) {
    return {
      target: LPU.NOKPC,
      transport: "СМП (экстренно) + уведомление/вызов АРКЦ НОКПЦ при необходимости",
      callouts: [`Послеродовый ≤42 дней: ${labelPostpartum(s.postpartumIssue)} → критическая маршрутизация (Маршрут: Критическое акyшерское состояние (КАС))`],
      sources: ["Прил. 5: неотложные состояния в послеродовом периоде (АРКЦ НОКПЦ)"],
    };
  }

  const target = tg === "borovichi" ? LPU.BOR : tg === "valdai" ? LPU.VALDAI : LPU.NOKPC;
  const alternative = target.id === LPU.VALDAI.id ? LPU.NOKPC : undefined;

  return {
    target,
    alternative,
    transport: target.id === LPU.VALDAI.id ? "СМП (по согласованию)" : "СМП",
    callouts: ["Послеродовый ≤42 дней: прочее осложнение → по территории"],
    sources: ["Упрощение: послеродовое прочее → как акушерский стационар по территории"],
  };
}

function routeSpecialOverrides(s: FormState): RoutingResult | null {
  const tg = groupOfTerritory(s.territory);

  if (s.infectionType === "flu_covid") {
    return {
      target: LPU.NOIB,
      transport: "СМП",
      callouts: ["Инфекция: грипп/COVID"],
      sources: ["Схема: «Грипп и COVID → Новгородская областная инфекционная больница»"],
    };
  }

  if (s.infectionType === "arvi_pneumo") {
    if (s.infectionSevere) {
      const useNokpc = !!s.infectionOver7Days;
      return {
        target: useNokpc ? LPU.NOKPC : LPU.NOKB,
        transport: "СМП (с учётом тяжести), при необходимости согласование",
        callouts: [
          "Инфекция: ОРВИ/пневмония",
          "Тяжёлое состояние",
          useNokpc ? "Опция по схеме: >7 дней → НОКПЦ" : "Маршрут на НОКБ",
        ],
        sources: ["Схема: «Беременные с пневмонией/ОРВИ» (тяжёлые состояния)"],
      };
    }

    const target = tg === "borovichi" ? LPU.BOR : tg === "staraya_russa" ? LPU.STAR : LPU.CGKB;

    return {
      target,
      transport: "СМП",
      callouts: ["Инфекция: ОРВИ/пневмония", "Лёгкое/среднее течение → по территории"],
      sources: ["Схема: «Пневмония и ОРВИ» (по территориям → Боровичи/Старая Русса/ЦГКБ)"],
    };
  }

  if (s.trauma) {
    const severe = !!s.traumaSevere;

    if (severe) {
      const target = traumaIcuTargetByTerritory(s.territory);

      return {
        target,
        alternative: LPU.NOKB,
        transport: target.id === LPU.VALDAI.id ? "СМП (экстренно, по согласованию)" : "СМП (экстренно)",
        callouts: [
          "ДТП/травма",
          "Требуется реанимация → ближайшее ЛПУ с ОАРИТ (ВН/Боровичи/Пестово/Старая Русса/Валдай)",
          "При необходимости — дальнейшая эвакуация/перевод в НОКБ",
        ],
        sources: ["Уточнение: при травме и необходимости реанимации — ближайшее ЛПУ с ОАРИТ (ВН/Боровичи/Пестово/Старая Русса/Валдай)"],
      };
    }

    const target = nearestByTerritory(tg);
    return {
      target,
      alternative: LPU.NOKB,
      transport: target.id === LPU.VALDAI.id ? "СМП (по согласованию)" : "СМП",
      callouts: ["ДТП/травма", "Без признаков тяжести → ближайшая больница по территории", "При ухудшении/политравме — перевод в НОКБ"],
      sources: ["MVP: ДТП/травма (нетяжёлая) → ближайшая больница по территории"],
    };
  }

  if (s.surgery) {
    const life = !!s.surgeryLifeThreat;

    if (life) {
      // Для гинекологии (<37) сохраняем выбор профиля.
      if (isGyneScenario(s)) {
        const profile: SurgeryProfile = s.surgeryProfile ?? "regional";
        return {
          target: profile === "city" ? LPU.CGKB : LPU.NOKB,
          transport: "СМП (экстренно)",
          callouts: ["Экстрагенитальная хирургия: угроза жизни", "Гинекология (<37) → выбор профиля (ЦГКБ/НОКБ)"],
          sources: ["Конспект: <37 недель при угрозе жизни → ЦГКБ или НОКБ (по профилю)"],
        };
      }

      // Для акушерства и послеродового — на НОКБ
      return {
        target: LPU.NOKB,
        transport: "СМП (экстренно)",
        callouts: ["Экстрагенитальная хирургия: угроза жизни", "Акушерство / послеродовый период → НОКБ"],
        sources: ["Конспект: при угрозе жизни → НОКБ"],
      };
    }

    const target =
      tg === "borovichi"
        ? LPU.BOR
        : tg === "staraya_russa"
        ? LPU.STAR
        : tg === "valdai"
        ? LPU.VALDAI
        : LPU.CGKB;

    const alternative = target.id === LPU.VALDAI.id ? LPU.NOKPC : undefined;

    return {
      target,
      alternative,
      transport: target.id === LPU.VALDAI.id ? "СМП (по согласованию)" : "СМП",
      callouts: ["Экстрагенитальная хирургия без явной угрозы жизни → по территории"],
      sources: ["Схема: «в ЦРБ/ММЦ только при отсутствии угрозы жизни; при угрозе → ЦГКБ/НОКБ»"],
    };
  }

  if (s.extragenitalInpatient) {
    return {
      target: LPU.NOKB,
      transport: "СМП (по согласованию/профилю)",
      callouts: [
        "Тяжёлая экстрагенитальная патология / требуется профильный стационар",
        "Маршрут на НОКБ",
      ],
      sources: ["Экстрагенитальная (не хирургия) → НОКБ"],
    };
  }

  return null;
}

export function evalRoutingLegacy(s: FormState): RoutingResult | null {
  if (!s.scenario) return null;

  const special = routeSpecialOverrides(s);
  if (special) return special;

  if (isPostpartumScenario(s)) return routePostpartum(s);
  if (isGyneScenario(s)) return routeGyneLt37(s);
  return routeObstetrics(s);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isLpu(value: unknown): value is Lpu {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.address === "string" &&
    (value.notes === undefined || typeof value.notes === "string")
  );
}

function routingResultFromRules(value: unknown): RoutingResult {
  if (
    !isRecord(value) ||
    !isLpu(value.target) ||
    (value.alternative !== undefined && !isLpu(value.alternative)) ||
    typeof value.transport !== "string" ||
    !isStringArray(value.callouts) ||
    !isStringArray(value.sources)
  ) {
    throw new Error("rules_v1 вернул некорректный акушерский результат.");
  }
  return value as RoutingResult;
}

function normalizeRoutingState(state: FormState) {
  return prepareRoutingEvaluationState("obgyn", state);
}

export function evaluateObstetricsRoutingRuleSet(
  ruleSet: import("./rules-v1.js").RoutingRuleSetV1,
  state: Readonly<Record<string, unknown>>,
) {
  return evaluateRoutingRuleSetV1(
    ruleSet,
    prepareRoutingEvaluationState("obgyn", state),
  );
}

export function evalRoutingRulesV1(state: FormState): RoutingResult | null {
  if (!state.scenario) return null;
  const evaluation = evaluateRoutingRuleSetV1(
    OBSTETRICS_RULE_SET_V1,
    normalizeRoutingState(state),
  );
  return evaluation ? routingResultFromRules(evaluation.result) : null;
}

export function evalRouting(state: FormState): RoutingResult | null {
  return evalRoutingRulesV1(state);
}

function labelRisk(r: RiskGroup) {
  return r === "low" ? "низкий" : r === "mid" ? "средний" : "высокий";
}

function labelCriticalKind(k: CriticalKind) {
  switch (k) {
    case "bleeding":
      return "кровотечение";
    case "preeclampsia_eclampsia":
      return "преэклампсия/эклампсия/судороги";
    case "sepsis_shock":
      return "сепсис/шок";
    case "resp_failure":
      return "дыхательная недостаточность";
    case "teo_cardiac":
      return "ТЭО/острая кардиальная декомпенсация";
    default:
      return "прочее критическое";
  }
}

function labelPostpartum(p: PostpartumIssue) {
  switch (p) {
    case "bleeding":
      return "кровотечение";
    case "sepsis_fever":
      return "лихорадка/подозрение на сепсис";
    case "seizures_hypertensive":
      return "судороги/гипертензивные осложнения";
    case "resp_failure":
      return "дыхательная недостаточность";
    case "teo_cardiac":
      return "тромбоэмболические/кардиальные осложнения";
    default:
      return "прочее/послеоперационное/боль";
  }
}

export function labelBranch(b: Branch) {
  return b;
}

export function warnings(s: FormState): string[] {
  const w: string[] = [];

  if (s.critical && s.infectionType && s.infectionType !== "none") w.push("Выбраны и критическое состояние, и инфекция — приоритет инфекции.");
  if (s.critical && s.trauma) w.push("Выбраны и критическое состояние, и ДТП/травма — приоритет ДТП/травмы.");
  if (s.critical && s.surgery) w.push("Выбраны и критическое состояние, и хирургия — приоритет хирургии.");
  if (s.critical && s.extragenitalInpatient) w.push("Выбраны и критическое состояние, и тяжёлая экстрагенитальная патология — приоритет маршрута на НОКБ.");

  if (s.infectionType && s.infectionType !== "none" && s.trauma) w.push("Выбраны и инфекция, и ДТП/травма — приоритет инфекции.");
  if (s.infectionType && s.infectionType !== "none" && s.surgery) w.push("Выбраны и инфекция, и хирургия — приоритет инфекции.");
  if (s.trauma && s.surgery) w.push("Выбраны и ДТП/травма, и хирургия — приоритет ДТП/травмы.");

  if (!s.territory) w.push("Не выбрана территория прикрепления. Территорию можно выбрать выбрав профиль маршрyта");

  if (
    s.critical &&
    !s.criticalRoute &&
    (isObstetricsScenario(s) || isPostpartumScenario(s))
  ) {
    w.push("Критическое состояние отмечено — уточните тип (КАС/профильная), чтобы выбрать НОКПЦ или НОКБ.");
  }

  if (s.infectionType === "arvi_pneumo" && s.infectionSevere === undefined) {
    w.push("ОРВИ/пневмония выбраны — уточните тяжесть (тяжёлое состояние/нет).");
  }

  if (s.trauma && s.traumaSevere === undefined) {
    w.push("ДТП/травма отмечены — уточните тяжесть (тяжёлое/нет). Для yточнения тяжести нажмите ДАЛЕЕ.");
  }

  if (s.pretermLabor && s.canDeliverToNokpc === undefined) {
    w.push("Преждевременные роды отмечены — укажите, возможна ли доставка в НОКПЦ.");
  }

  return w;
}

export const obstetricsRoutingProfile = {
  id: "obgyn",
  title: "Акушерство / гинекология",
  description: "Опросник → сценарий → маршрутизация → обоснование",
  content: obstetricsRoutingContent,
  evaluate: evalRouting,
} satisfies RoutingProfileDefinition<FormState, RoutingResult>;
