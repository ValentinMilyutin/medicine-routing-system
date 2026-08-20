import React, { useMemo, useState } from "react";
import {
  type Scenario,
  type InfectionType,
  type RiskGroup,
  type CriticalKind,
  type CriticalRoute,
  type PostpartumIssue,
  type SurgeryProfile,
  type FormState,
  TERRITORIES_BOROVICHI,
  TERRITORIES_STARAYA_RUSSA,
  TERRITORIES_VALDAI,
  TERRITORIES_NOVGOROD,
  groupOfTerritory,
  isGyneScenario,
  isObstetricsScenario,
  isPostpartumScenario,
  deriveBranch,
  evalRouting,
  labelBranch,
  warnings,
} from "./routing/obstetrics";

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
