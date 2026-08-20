import { type ReactNode, useMemo, useState } from "react";
import {
  type Branch,
  type StrokeOnset,
  type ArmMovement,
  type GripStrength,
  type Facility,
  type BSKFormState,
  TERRITORIES,
  BRANCH_LABELS,
  evaluateRouting,
} from "./routing/bsk";

function CheckBox(props: {
  checked?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex gap-3 rounded-2xl border border-neutral-200 bg-white p-3">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4"
        checked={Boolean(props.checked)}
        onChange={(event) => props.onChange(event.currentTarget.checked)}
      />
      <span>
        <span className="block text-sm font-medium text-neutral-900">
          {props.label}
        </span>
        {props.hint ? (
          <span className="block text-xs text-neutral-500 mt-0.5">{props.hint}</span>
        ) : null}
      </span>
    </label>
  );
}

function Section(props: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="text-lg font-semibold mb-4">{props.title}</div>
      {props.children}
    </div>
  );
}

function ListBlock(props: { title: string; items: string[] }) {
  if (props.items.length === 0) return null;

  return (
    <div>
      <div className="font-semibold text-sm mb-2">{props.title}</div>
      <ul className="list-disc pl-5 space-y-1 text-sm text-neutral-700">
        {props.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function FacilityCard(props: { facility: Facility; label?: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      {props.label ? (
        <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">
          {props.label}
        </div>
      ) : null}
      <div className="font-semibold">{props.facility.name}</div>
      <div className="text-sm text-neutral-600">{props.facility.role}</div>
      {props.facility.address ? (
        <div className="text-sm text-neutral-500 mt-1">{props.facility.address}</div>
      ) : null}
    </div>
  );
}

export default function BSKSMPRoutingWizard() {
  const [state, setState] = useState<BSKFormState>({
    branch: "stroke",
  });

  const result = useMemo(() => evaluateRouting(state), [state]);

  const patch = (next: Partial<BSKFormState>) => {
    setState((prev) => ({ ...prev, ...next }));
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="text-2xl font-bold">
            БСК / ССЗ: маршрутизация пациентов для СМП
          </div>
          <div className="text-sm text-neutral-600 mt-2">
            Профиль для скорой медицинской помощи: ОНМК, ОКС, другие острые ССЗ,
            КИНК — критическая ишемия нижней конечности. Показываем маршрут,
            срочность, кого предупредить и какие данные передать принимающей
            стороне.
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <Section title="1. Территория и общий риск">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Муниципальный округ / место вызова
                  </label>
                  <select
                    className="w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2"
                    value={state.territory ?? ""}
                    onChange={(event) =>
                      patch({ territory: event.currentTarget.value || undefined })
                    }
                  >
                    <option value="">Выберите территорию</option>
                    {TERRITORIES.map((territory) => (
                      <option key={territory.name} value={territory.name}>
                        {territory.name}
                      </option>
                    ))}
                  </select>
                </div>

                <CheckBox
                  checked={state.unstableVitals}
                  onChange={(checked) => patch({ unstableVitals: checked })}
                  label="Есть выраженные нарушения витальных функций"
                  hint="Шок, критическая гипотензия, тяжёлая дыхательная недостаточность, угроза остановки кровообращения, необходимость реанимации."
                />
              </div>
            </Section>

            <Section title="2. Ведущая ветка">
              <div className="grid grid-cols-1 gap-2">
                {(Object.keys(BRANCH_LABELS) as Branch[]).map((branch) => (
                  <button
                    key={branch}
                    type="button"
                    onClick={() => patch({ branch })}
                    className={[
                      "rounded-2xl border p-3 text-left transition",
                      state.branch === branch
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 bg-white hover:bg-neutral-50",
                    ].join(" ")}
                  >
                    <div className="font-semibold">{BRANCH_LABELS[branch]}</div>
                  </button>
                ))}
              </div>
            </Section>

            {state.branch === "stroke" ? (
              <Section title="3. ОНМК: признаки и время начала симптомов">
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-neutral-800">
                    Основные признаки
                  </div>
                  <CheckBox
                    checked={state.fastFace}
                    onChange={(checked) => patch({ fastFace: checked })}
                    label="Есть асимметрия лица"
                  />
                  <CheckBox
                    checked={state.fastArm}
                    onChange={(checked) =>
                      patch({
                        fastArm: checked,
                        armMovement: checked ? state.armMovement : undefined,
                        gripStrength: checked ? state.gripStrength : undefined,
                      })
                    }
                    label="Есть слабость или онемение одной руки"
                  />
                  <CheckBox
                    checked={state.fastSpeech}
                    onChange={(checked) => patch({ fastSpeech: checked })}
                    label="Есть нарушение речи"
                  />

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Когда появились симптомы?
                    </label>
                    <select
                      className="w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2"
                      value={state.strokeOnset ?? ""}
                      onChange={(event) =>
                        patch({
                          strokeOnset: (event.currentTarget.value || undefined) as
                            | StrokeOnset
                            | undefined,
                          onsetWithin5h:
                            event.currentTarget.value === "known"
                              ? state.onsetWithin5h
                              : undefined,
                        })
                      }
                    >
                      <option value="">Выберите вариант</option>
                      <option value="known">Точное время начала известно</option>
                      <option value="woke_with_symptoms">
                        Пациент проснулся уже с симптомами
                      </option>
                      <option value="unknown">Время начала неизвестно</option>
                    </select>
                  </div>

                  {state.strokeOnset === "known" ? (
                    <CheckBox
                      checked={state.onsetWithin5h}
                      onChange={(checked) => patch({ onsetWithin5h: checked })}
                      label="С учётом доставки пациент окажется в стационаре не позднее 5 часов от начала симптомов"
                    />
                  ) : null}

                  {state.fastArm ? (
                    <div className="space-y-3 rounded-2xl bg-neutral-50 p-3">
                      <div>
                        <div className="text-sm font-semibold text-neutral-800">
                          Тяжесть слабости руки
                        </div>
                        <div className="text-xs text-neutral-500 mt-0.5">
                          Выберите наблюдаемые признаки.
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Как пациент удерживает вытянутую руку?
                        </label>
                        <select
                          className="w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2"
                          value={state.armMovement ?? ""}
                          onChange={(event) =>
                            patch({
                              armMovement: (event.currentTarget.value || undefined) as
                                | ArmMovement
                                | undefined,
                            })
                          }
                        >
                          <option value="">Выберите вариант</option>
                          <option value="holds">Удерживает руку</option>
                          <option value="drifts">Рука постепенно опускается</option>
                          <option value="falls">Рука быстро падает или не удерживается</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Сила сжатия кисти
                        </label>
                        <select
                          className="w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2"
                          value={state.gripStrength ?? ""}
                          onChange={(event) =>
                            patch({
                              gripStrength: (event.currentTarget.value || undefined) as
                                | GripStrength
                                | undefined,
                            })
                          }
                        >
                          <option value="">Выберите вариант</option>
                          <option value="normal">Сила сохранена</option>
                          <option value="weak">Сила снижена</option>
                          <option value="absent">Сжатие кисти отсутствует</option>
                        </select>
                      </div>
                    </div>
                  ) : null}
                </div>
              </Section>
            ) : null}

            {state.branch === "acs" ? (
              <Section title="3. ОКС: симптомы / ЭКГ / ЧКВ / ТЛТ">
                <div className="space-y-3">
                  <CheckBox
                    checked={state.chestPainOrEquivalent}
                    onChange={(checked) => patch({ chestPainOrEquivalent: checked })}
                    label="Боль в грудной клетке или эквивалент ОКС"
                  />
                  <CheckBox
                    checked={state.ecgDone}
                    onChange={(checked) => patch({ ecgDone: checked })}
                    label="ЭКГ 12 отведений выполнена"
                    hint="Цель — не позднее 10 минут от первого контакта."
                  />
                  <CheckBox
                    checked={state.stElevation}
                    onChange={(checked) => patch({ stElevation: checked })}
                    label="Есть подъём ST / новая БЛНПГ / признаки заднего ИМ"
                  />
                  <CheckBox
                    checked={state.pciWithin120}
                    onChange={(checked) => patch({ pciWithin120: checked })}
                    label="Доставка на ЧКВ возможна в пределах 120 минут"
                  />
                  <CheckBox
                    checked={state.tltContraindications}
                    onChange={(checked) => patch({ tltContraindications: checked })}
                    label="Есть противопоказания к ТЛТ / требуется осторожность"
                  />
                  <CheckBox
                    checked={state.nsteHighRisk}
                    onChange={(checked) => patch({ nsteHighRisk: checked })}
                    label="ОКС без подъёма ST, но есть высокий/очень высокий риск"
                  />
                </div>
              </Section>
            ) : null}

            {state.branch === "other_cvd" ? (
              <Section title="3. Другие острые ССЗ">
                <div className="space-y-3">
                  <CheckBox
                    checked={state.rhythmDisorder}
                    onChange={(checked) => patch({ rhythmDisorder: checked })}
                    label="Нарушение ритма"
                  />
                  <CheckBox
                    checked={state.conductionDisorder}
                    onChange={(checked) => patch({ conductionDisorder: checked })}
                    label="Нарушение проводимости"
                  />
                  <CheckBox
                    checked={state.suspectedPE}
                    onChange={(checked) => patch({ suspectedPE: checked })}
                    label="Подозрение на ТЭЛА"
                  />
                  <CheckBox
                    checked={state.acuteHeartFailure}
                    onChange={(checked) => patch({ acuteHeartFailure: checked })}
                    label="Острая сердечная недостаточность"
                  />
                </div>
              </Section>
            ) : null}

            {state.branch === "kink" ? (
              <Section title="3. КИНК — критическая ишемия нижней конечности">
                <div className="space-y-3">
                  <CheckBox
                    checked={state.restPain}
                    onChange={(checked) => patch({ restPain: checked })}
                    label="Боль в нижней конечности в покое"
                  />
                  <CheckBox
                    checked={state.legDownAtNight}
                    onChange={(checked) => patch({ legDownAtNight: checked })}
                    label="Пациент опускает ногу вниз ночью для уменьшения боли"
                  />
                  <CheckBox
                    checked={state.trophicChanges}
                    onChange={(checked) => patch({ trophicChanges: checked })}
                    label="Есть трофические изменения / язвы"
                  />
                  <CheckBox
                    checked={state.necrosisGangrene}
                    onChange={(checked) => patch({ necrosisGangrene: checked })}
                    label="Некроз / гангрена"
                  />
                  <CheckBox
                    checked={state.infectionSigns}
                    onChange={(checked) => patch({ infectionSigns: checked })}
                    label="Инфекционно-воспалительные изменения"
                  />
                </div>
              </Section>
            ) : null}
          </div>

          <div className="space-y-4">
            <Section title="Итог маршрутизации">
              {!result ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Сначала выбери территорию вызова. После этого система покажет
                  предварительный маршрут, действия СМП и данные для передачи.
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-xl font-bold">{result.title}</div>
                    <div className="text-sm text-neutral-600 mt-1">
                      Срочность: {result.urgency}
                    </div>
                    <div className="text-sm text-neutral-600">
                      Транспорт: {result.transport}
                    </div>
                  </div>

                  <FacilityCard facility={result.target} label="Рекомендуемая МО" />

                  {result.alternative ? (
                    <FacilityCard
                      facility={result.alternative}
                      label="Дополнительный ориентир / зона / уровень согласования"
                    />
                  ) : null}

                  <ListBlock title="Кого предупредить" items={result.notify} />
                  <ListBlock title="Чек-лист СМП" items={result.checklist} />
                  <ListBlock
                    title="Что передать принимающей стороне"
                    items={result.handoff}
                  />
                  <ListBlock title="Основание" items={result.sources} />

                  {result.warnings.length > 0 ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                      <div className="font-semibold text-sm text-red-900 mb-2">
                        Требует врачебной сверки
                      </div>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-red-800">
                        {result.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
