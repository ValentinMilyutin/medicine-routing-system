import React, { useMemo, useState } from "react";
import {
  type OncologyStatus,
  type LeadingSign,
  type PalliativeFormat,
  type FormState,
  TERRITORY_OPTIONS,
  GENERAL_EMERGENCY_SIGNS,
  SURGICAL_SYNDROME_SIGNS,
  PALLIATIVE_SYMPTOM_SIGNS,
  evalRouting,
  signLabel,
  warnings,
} from "./routing/oncology";

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
  }, [step, s]);

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
