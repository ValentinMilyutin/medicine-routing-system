import React, { useMemo, useState } from "react";

type Scenario = "gyne_lt37" | "obstetrics_ge37" | "postpartum_le42";
type InfectionType = "none" | "arvi_pneumo" | "flu_covid";
type RiskGroup = "low" | "mid" | "high";

type TerritoryGroup = "borovichi" | "staraya_russa" | "valdai" | "novgorod" | "unknown";

type CriticalKind =
  | "bleeding"
  | "preeclampsia_eclampsia"
  | "sepsis_shock"
  | "resp_failure"
  | "teo_cardiac"
  | "other";

type CriticalRoute = "kas_arkc" | "profile_nokb";

type PostpartumIssue =
  | "bleeding"
  | "sepsis_fever"
  | "seizures_hypertensive"
  | "resp_failure"
  | "teo_cardiac"
  | "postop_pain_other";

type SurgeryProfile = "city" | "regional";

type Lpu = { id: string; name: string; notes?: string };

type FormState = {
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

type RoutingResult = {
  target: Lpu;
  alternative?: Lpu;
  transport: string;
  callouts: string[];
  sources: string[];
};

const LPU = {
  NOKB: { id: "nokb", name: "ГОБУЗ «Новгородская областная клиническая больница» (НОКБ)" } as Lpu,
  NOKPC: {
    id: "nokpc",
    name: "ГОБУЗ «НОКПЦ имени В.Ю. Мишекурина» (НОКПЦ)",
    notes: "АРКЦ/перинатальный центр",
  } as Lpu,
  NOIB: { id: "noib", name: "ГОБУЗ «Новгородская областная инфекционная больница»" } as Lpu,
  CGKB: { id: "cgkb", name: "ГОБУЗ «Центральная городская клиническая больница» (ЦГКБ)" } as Lpu,
  BOR: { id: "bor", name: "ГОБУЗ «Боровичская ЦРБ» (Боровичи)" } as Lpu,
  PESTO: { id: "pesto", name: "ГОБУЗ «Пестовская ЦРБ» (Пестово)" } as Lpu,
  STAR: { id: "star", name: "ГОБУЗ «Старорусская ЦРБ» (Старая Русса)" } as Lpu,
  VALDAI: {
    id: "valdai",
    name: "Валдайский ММЦ ФГБУ «СЗОНКЦ им. Л.Г. Соколова» ФМБА России",
    notes: "по согласованию",
  } as Lpu,
};

// Акушерские/общие территориальные группы для override-веток
const TERRITORIES_BOROVICHI = [
  "Боровичи",
  "Боровичский район",
  "Любытинский",
  "Хвойнинский",
  "Пестовский",
  "Мошенской",
  "Окуловский",
];

const TERRITORIES_STARAYA_RUSSA = [
  "Старая Русса",
  "Старорусский",
  "Парфинский",
  "Поддорский",
  "Холмский",
  "Волотовский",
];

const TERRITORIES_VALDAI = ["Валдайский", "Крестецкий", "Демянский", "Марёвский"];

const TERRITORIES_NOVGOROD = [
  "Великий Новгород",
  "Новгородский район",
  "Батецкий",
  "Шимский",
  "Маловишерский",
  "Чудовский",
  "Солецкий",
];

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

function groupOfTerritory(t?: string): TerritoryGroup {
  if (!t) return "unknown";
  if (TERRITORIES_BOROVICHI.includes(t)) return "borovichi";
  if (TERRITORIES_STARAYA_RUSSA.includes(t)) return "staraya_russa";
  if (TERRITORIES_VALDAI.includes(t)) return "valdai";
  if (TERRITORIES_NOVGOROD.includes(t)) return "novgorod";
  return "unknown";
}

function isGyneScenario(s: FormState): boolean {
  return s.scenario === "gyne_lt37";
}

function isObstetricsScenario(s: FormState): boolean {
  return s.scenario === "obstetrics_ge37";
}

function isPostpartumScenario(s: FormState): boolean {
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

function deriveBranch(s: FormState): Branch {
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

function evalRouting(s: FormState): RoutingResult | null {
  if (!s.scenario) return null;

  const special = routeSpecialOverrides(s);
  if (special) return special;

  if (isPostpartumScenario(s)) return routePostpartum(s);
  if (isGyneScenario(s)) return routeGyneLt37(s);
  return routeObstetrics(s);
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

function labelBranch(b: Branch) {
  return b;
}

function warnings(s: FormState): string[] {
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

const Button = (props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) => {
  const { variant = "primary", className = "", ...rest } = props;
  const base =
    "px-3 py-2 rounded-xl text-sm font-medium transition border " +
    (variant === "primary"
      ? "bg-black text-white border-black hover:opacity-90"
      : "bg-white text-black border-neutral-200 hover:bg-neutral-50");
  return <button className={`${base} ${className}`} {...rest} />;
};

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
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
    <select className="w-full rounded-xl border border-neutral-200 p-2" value={value ?? ""} onChange={(e) => onChange(e.target.value as T)}>
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

const TERRITORY_OPTIONS: string[] = Array.from(
  new Set([
    ...TERRITORIES_NOVGOROD,
    ...TERRITORIES_BOROVICHI,
    ...TERRITORIES_STARAYA_RUSSA,
    ...TERRITORIES_VALDAI,
    "Мошенской район",
  ])
);

export default function RoutingWizard() {
  const [s, setS] = useState<FormState>({
    infectionType: "none",
    critical: false,
    surgery: false,
    trauma: false,
    extragenitalInpatient: false,
  });
  const [step, setStep] = useState<number>(0);

  const branch = deriveBranch(s);
  const result = useMemo(() => evalRouting(s), [s]);

  const canNext = useMemo(() => {
    if (step === 0) return !!s.scenario;

    if (step === 1) {
      return !!s.territory;
    }

    if (step === 2) return true;

    if (step === 3) {
      if (branch === "critical") {
        if (isObstetricsScenario(s) || isPostpartumScenario(s)) return !!s.criticalRoute;
        return true;
      }

      if (branch === "infection") {
        if (!s.infectionType || s.infectionType === "none") return false;
        if (s.infectionType === "arvi_pneumo") return s.infectionSevere !== undefined;
        return true;
      }

      if (branch === "trauma") return s.traumaSevere !== undefined;

      if (branch === "surgery") {
        if (s.surgeryLifeThreat === undefined) return false;
        if (s.surgeryLifeThreat && isGyneScenario(s)) return !!s.surgeryProfile;
        return true;
      }

      if (branch === "extragenital") return true;

      if (isObstetricsScenario(s)) {
        if (s.pretermLabor) return s.canDeliverToNokpc !== undefined;
        return !!s.riskDelivery;
      }

      if (isGyneScenario(s)) return true;
      if (isPostpartumScenario(s)) return !!s.postpartumIssue;
    }

    return true;
  }, [step, s, branch]);

  const ws = warnings(s);

  return (
    <div className="min-h-screen bg-neutral-50 p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-bold">Маршрутизация СМП — акушерство/гинекология (MVP)</div>
            <div className="text-sm text-neutral-600">Профиль → триаж → уточнение → конкретная ЛПУ</div>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              setS({
                infectionType: "none",
                critical: false,
                surgery: false,
                trauma: false,
                extragenitalInpatient: false,
              });
              setStep(0);
            }}
          >
            Сброс
          </Button>
        </div>

        {ws.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="font-semibold mb-1">Подсказки/предупреждения</div>
            <ul className="list-disc ml-5 space-y-1">
              {ws.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
        )}

        {step === 0 && (
          <Card title="Экран 1 — Профиль">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {[
                ["gyne_lt37", "Гинекология (<37 недель)"],
                ["obstetrics_ge37", "Акушерство (≥37 недель, роды/родоразрешение)"],
                ["postpartum_le42", "Послеродовый период ≤ 42 дней"],
              ].map(([val, label]) => (
                <Button
                  key={val}
                  variant={s.scenario === (val as Scenario) ? "primary" : "ghost"}
                  onClick={() =>
                    setS((p) => ({
                      ...p,
                      scenario: val as Scenario,
                      postpartumIssue: val === "postpartum_le42" ? p.postpartumIssue : undefined,
                      pretermLabor: val === "obstetrics_ge37" ? p.pretermLabor : undefined,
                      canDeliverToNokpc: val === "obstetrics_ge37" ? p.canDeliverToNokpc : undefined,
                      riskDelivery: val === "obstetrics_ge37" ? p.riskDelivery : undefined,
                      criticalRoute:
                        p.critical && (val === "obstetrics_ge37" || val === "postpartum_le42")
                          ? p.criticalRoute ?? "kas_arkc"
                          : undefined,
                    }))
                  }
                >
                  {label}
                </Button>
              ))}
            </div>
          </Card>
        )}

        {step === 1 && (
          <Card title="Экран 2 — Базовые данные">
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium mb-1">Территория прикрепления (выбор из списка)</div>
                <select
                  className="w-full rounded-xl border border-neutral-200 p-2"
                  value={s.territory ?? ""}
                  onChange={(e) => setS((p) => ({ ...p, territory: e.target.value }))}
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
                <div className="text-xs text-neutral-500 mt-1">
                  Группа: <span className="font-medium">{groupOfTerritory(s.territory)}</span>
                </div>
              </div>

              {isGyneScenario(s) && (
                <div className="text-sm text-neutral-600">
                  Выбран профиль: гинекология. По рабочему правилу это соответствует сроку беременности &lt;37 недель.
                </div>
              )}

              {isObstetricsScenario(s) && (
                <div className="text-sm text-neutral-600">
                  Выбран профиль: акушерство. По рабочему правилу это соответствует сроку беременности ≥37 недель и/или маршрутизации на роды / родоразрешение.
                </div>
              )}

              {isPostpartumScenario(s) && (
                <div className="text-sm text-neutral-600">
                  Послеродовый период фиксируется как ≤ 42 дней.
                </div>
              )}
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card title="Экран 3 — Перебивающий триаж">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">Критическое состояние / Критическое акyшерское состояние (КАС) / угроза жизни?</div>
                  <div className="text-sm text-neutral-600">
                    Для акушерства и послеродового периода — акушерская критика (КАС/профильная). Для гинекологии — срочный случай: экстренная госпитализация по территории, либо НОКБ при тяжёлой экстрагенитальной патологии.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={!!s.critical}
                  onChange={(e) =>
                    setS((p) => ({
                      ...p,
                      critical: e.target.checked,
                      criticalRoute: e.target.checked
                        ? isObstetricsScenario(p) || isPostpartumScenario(p)
                          ? p.criticalRoute ?? "kas_arkc"
                          : undefined
                        : undefined,
                      criticalKind: e.target.checked ? p.criticalKind : undefined,
                    }))
                  }
                />
              </div>

              {s.critical && (
                <div className="space-y-2">
                  {isObstetricsScenario(s) || isPostpartumScenario(s) ? (
                    <div>
                      <div className="text-sm font-medium mb-1">Тип критики (куда везти)</div>
                      <Select<CriticalRoute>
                        value={s.criticalRoute}
                        onChange={(v) => setS((p) => ({ ...p, criticalRoute: v }))}
                        options={[
                          { value: "kas_arkc", label: "Критическое акyшерское состояние (КАС) → НОКПЦ (АРКЦ)" },
                          { value: "profile_nokb", label: "Экстрагенитальная/профильная критика → НОКБ" },
                        ]}
                        placeholder="Выберите…"
                      />
                    </div>
                  ) : (
                    <div className="text-sm text-neutral-700">
                      Для гинекологии отдельный маршрут Критическое акyшерское состояние (КАС) → НОКПЦ не используется.
                      Итог будет определён как:
                      <br />— НОКБ, если отмечена тяжёлая экстрагенитальная патология
                      <br />— иначе экстренная гинекологическая госпитализация по территории
                    </div>
                  )}

                  <div>
                    <div className="text-sm font-medium mb-1">Подтип критического состояния (опционально)</div>
                    <Select<CriticalKind>
                      value={s.criticalKind}
                      onChange={(v) => setS((p) => ({ ...p, criticalKind: v }))}
                      options={[
                        { value: "bleeding", label: "Кровотечение" },
                        { value: "preeclampsia_eclampsia", label: "Преэклампсия/эклампсия/судороги" },
                        { value: "sepsis_shock", label: "Сепсис/шок" },
                        { value: "resp_failure", label: "Дыхательная недостаточность" },
                        { value: "teo_cardiac", label: "ТЭО/кардиальная декомпенсация" },
                        { value: "other", label: "Прочее" },
                      ]}
                      placeholder="Выберите…"
                    />
                  </div>
                </div>
              )}

              <div>
                <div className="font-medium mb-1">Инфекционный диагноз?</div>
                <Select<InfectionType>
                  value={s.infectionType ?? "none"}
                  onChange={(v) =>
                    setS((p) => ({
                      ...p,
                      infectionType: v,
                      infectionSevere: v === "arvi_pneumo" ? p.infectionSevere : undefined,
                      infectionOver7Days: undefined,
                    }))
                  }
                  options={[
                    { value: "none", label: "Нет" },
                    { value: "arvi_pneumo", label: "ОРВИ / пневмония" },
                    { value: "flu_covid", label: "Грипп / COVID" },
                  ]}
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">ДТП / травма?</div>
                  <div className="text-sm text-neutral-600">Эта ветка имеет приоритет над профильной акушерско-гинекологической логикой.</div>
                </div>
                <input
                  type="checkbox"
                  checked={!!s.trauma}
                  onChange={(e) =>
                    setS((p) => ({
                      ...p,
                      trauma: e.target.checked,
                      traumaSevere: e.target.checked ? p.traumaSevere : undefined,
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">Экстрагенитальная патология, требующая хирургической помощи?</div>
                  <div className="text-sm text-neutral-600">Сохраняем как отдельный спец-override.</div>
                </div>
                <input
                  type="checkbox"
                  checked={!!s.surgery}
                  onChange={(e) =>
                    setS((p) => ({
                      ...p,
                      surgery: e.target.checked,
                      surgeryLifeThreat: e.target.checked ? p.surgeryLifeThreat : undefined,
                      surgeryProfile: e.target.checked ? p.surgeryProfile : undefined,
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">Тяжёлая экстрагенитальная патология / требуется профильный стационар (не хирургия)?</div>
                  <div className="text-sm text-neutral-600">
                    Для гинекологии это соответствует столбцу приказа 792-Д и ведёт в НОКБ. В текущей модели остаётся отдельным спец-override.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={!!s.extragenitalInpatient}
                  onChange={(e) => setS((p) => ({ ...p, extragenitalInpatient: e.target.checked }))}
                />
              </div>

              <div className="text-xs text-neutral-500">
                Активная ветка по приоритету: <span className="font-semibold">{labelBranch(branch)}</span>
              </div>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card title="Экран 4 — Уточнение по активной ветке">
            {branch === "critical" && (
              <div className="text-sm text-neutral-700">
                {isObstetricsScenario(s) || isPostpartumScenario(s)
                  ? "Доп. вопросов не требуется. Будет выдан маршрут по выбранному типу критики."
                  : "Для гинекологии отдельный выбор маршрута по КАС не требуется: итог задаётся гинекологической веткой."}
              </div>
            )}

            {branch === "infection" && (
              <div className="space-y-3">
                {s.infectionType === "flu_covid" && (
                  <div className="text-sm text-neutral-700">Инфекция грипп/COVID → маршрут в инфекционную больницу.</div>
                )}

                {s.infectionType === "arvi_pneumo" && (
                  <>
                    <div className="text-sm text-neutral-700">Для ОРВИ/пневмонии нужно уточнить тяжесть.</div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">Тяжёлое состояние / нужна реанимация?</div>
                      <YesNo
                        value={s.infectionSevere}
                        onChange={(v) =>
                          setS((p) => ({
                            ...p,
                            infectionSevere: v,
                            infectionOver7Days: v ? p.infectionOver7Days : undefined,
                          }))
                        }
                      />
                    </div>

                    {s.infectionSevere === true && (
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">Болезнь &gt; 7 дней от начала? (опция по схеме)</div>
                        <YesNo
                          value={s.infectionOver7Days}
                          onChange={(v) => setS((p) => ({ ...p, infectionOver7Days: v }))}
                        />
                      </div>
                    )}

                    {s.infectionSevere === false && (
                      <div className="text-sm text-neutral-600">Лёгкое/среднее течение → по территории.</div>
                    )}
                  </>
                )}
              </div>
            )}

            {branch === "trauma" && (
              <div className="space-y-3">
                <div className="text-sm text-neutral-700">Для ДТП/травмы нужно уточнить тяжесть.</div>
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">Тяжёлое состояние / политравма?</div>
                  <YesNo value={s.traumaSevere} onChange={(v) => setS((p) => ({ ...p, traumaSevere: v }))} />
                </div>
              </div>
            )}

            {branch === "surgery" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">Есть признаки угрозы жизни?</div>
                  <YesNo value={s.surgeryLifeThreat} onChange={(v) => setS((p) => ({ ...p, surgeryLifeThreat: v }))} />
                </div>

                {s.surgeryLifeThreat === true && isGyneScenario(s) && (
                  <div>
                    <div className="text-sm font-medium mb-1">Профиль</div>
                    <Select<SurgeryProfile>
                      value={s.surgeryProfile}
                      onChange={(v) => setS((p) => ({ ...p, surgeryProfile: v }))}
                      options={[
                        { value: "city", label: "Абдоминальная/гнойная/травма → ЦГКБ" },
                        { value: "regional", label: "Кардио/нейро/высокоспец → НОКБ" },
                      ]}
                      placeholder="Выберите профиль…"
                    />
                  </div>
                )}

                {s.surgeryLifeThreat === false && (
                  <div className="text-sm text-neutral-700">
                    Без угрозы жизни — по территории: Боровичи/Старая Русса/Валдай (по согласованию)/ЦГКБ.
                  </div>
                )}
              </div>
            )}

            {branch === "extragenital" && (
              <div className="text-sm text-neutral-700">Тяжёлая экстрагенитальная патология: маршрут на НОКБ.</div>
            )}

            {branch === "ordinary" && (
              <div className="space-y-4">
                {isGyneScenario(s) && (
                  <div className="text-sm text-neutral-700">
                    Для гинекологии маршрутизация выполняется по приказу 792-Д.
                    Если нет тяжёлой экстрагенитальной патологии — используется территориальная колонка «Экстренная госпитализация».
                  </div>
                )}

                {isObstetricsScenario(s) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">Подозрение на преждевременные роды?</div>
                        <div className="text-sm text-neutral-600">
                          Если доставка в НОКПЦ возможна — цель НОКПЦ; если невозможна — ближайший стационар + вызов АРКЦ.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!s.pretermLabor}
                        onChange={(e) =>
                          setS((p) => ({
                            ...p,
                            pretermLabor: e.target.checked,
                            canDeliverToNokpc: e.target.checked ? p.canDeliverToNokpc : undefined,
                          }))
                        }
                      />
                    </div>

                    {s.pretermLabor && (
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">Возможна доставка в НОКПЦ?</div>
                        <YesNo value={s.canDeliverToNokpc} onChange={(v) => setS((p) => ({ ...p, canDeliverToNokpc: v }))} />
                      </div>
                    )}
                  </div>
                )}

                {isObstetricsScenario(s) && !s.pretermLabor && (
                  <>
                    <div className="text-sm font-medium">Группа риска родов</div>
                    <Select<RiskGroup>
                      value={s.riskDelivery}
                      onChange={(v) => setS((p) => ({ ...p, riskDelivery: v }))}
                      options={[
                        { value: "low", label: "Низкий" },
                        { value: "mid", label: "Средний" },
                        { value: "high", label: "Высокий" },
                      ]}
                    />
                  </>
                )}

                {isPostpartumScenario(s) && (
                  <>
                    <div className="text-sm font-medium">Что случилось?</div>
                    <Select<PostpartumIssue>
                      value={s.postpartumIssue}
                      onChange={(v) => setS((p) => ({ ...p, postpartumIssue: v }))}
                      options={[
                        { value: "bleeding", label: "Кровотечение" },
                        { value: "sepsis_fever", label: "Температура/подозрение на сепсис" },
                        { value: "seizures_hypertensive", label: "Судороги/гипертензивные осложнения" },
                        { value: "resp_failure", label: "Дыхательная недостаточность" },
                        { value: "teo_cardiac", label: "ТЭО/кардиальные осложнения" },
                        { value: "postop_pain_other", label: "Прочее/послеоперационное/боль" },
                      ]}
                    />
                  </>
                )}
              </div>
            )}
          </Card>
        )}

        {step === 4 && (
          <Card title="Результат маршрутизации">
            {!result ? (
              <div className="text-sm text-neutral-700">Не хватает данных для расчёта. Вернитесь назад.</div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl border border-neutral-200 p-3">
                  <div className="text-sm text-neutral-500">Куда везти</div>
                  <div className="text-lg font-semibold">{result.target.name}</div>
                  {result.target.notes && (
                    <div className="text-sm text-neutral-600">Примечание: {result.target.notes}</div>
                  )}
                </div>

                {result.alternative && (
                  <div className="rounded-2xl border border-neutral-200 p-3">
                    <div className="text-sm text-neutral-500">Альтернатива</div>
                    <div className="font-medium">{result.alternative.name}</div>
                  </div>
                )}

                <div className="rounded-2xl border border-neutral-200 p-3">
                  <div className="text-sm text-neutral-500">Транспортировка</div>
                  <div className="font-medium">{result.transport}</div>
                </div>

                <div className="rounded-2xl border border-neutral-200 p-3">
                  <div className="text-sm text-neutral-500">Обоснование</div>
                  <ul className="list-disc ml-5 text-sm text-neutral-800 space-y-1">
                    {result.callouts.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-neutral-200 p-3">
                  <div className="text-sm text-neutral-500">Источник</div>
                  <ul className="list-disc ml-5 text-sm text-neutral-800 space-y-1">
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
          <div className="text-sm text-neutral-600">Шаг {step + 1} / 5</div>
          <Button onClick={() => setStep((p) => Math.min(4, p + 1))} disabled={!canNext || step === 4}>
            Далее
          </Button>
        </div>
      </div>
    </div>
  );
}
