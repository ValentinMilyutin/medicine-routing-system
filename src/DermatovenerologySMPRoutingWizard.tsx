import { type ReactNode, useMemo, useState } from "react";

type Condition =
  | "angioedema"
  | "toxicoderma"
  | "lyell"
  | "stevens_johnson"
  | "none";

type Facility = {
  name: string;
  role: string;
  address: string;
};

type Territory = {
  name: string;
  outpatientTarget: Facility;
};

type FormState = {
  territory?: string;
  condition?: Condition;
  inpatientCare?: boolean;
};

type Source = {
  label: string;
  url?: string;
};

type RoutingResult = {
  title: string;
  target: Facility;
  urgency: string;
  transport: string;
  actions: string[];
  handoff: string[];
  sources: Source[];
  afterStabilization?: Facility;
};

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
} satisfies Record<string, Facility>;

const TERRITORIES: Territory[] = [
  { name: "Великий Новгород", outpatientTarget: FACILITIES.nokvdOutpatient },
  { name: "Батецкий район", outpatientTarget: FACILITIES.nokvdOutpatient },
  { name: "Боровичский район", outpatientTarget: FACILITIES.borovichi },
  { name: "Валдайский район", outpatientTarget: FACILITIES.valdai },
  { name: "Волотовский округ", outpatientTarget: FACILITIES.starayaRussa },
  { name: "Демянский район", outpatientTarget: FACILITIES.starayaRussa },
  { name: "Крестецкий район", outpatientTarget: FACILITIES.kresttsy },
  { name: "Любытинский район", outpatientTarget: FACILITIES.borovichi },
  { name: "Маловишерский район", outpatientTarget: FACILITIES.malayaVishera },
  { name: "Марёвский округ", outpatientTarget: FACILITIES.starayaRussa },
  { name: "Мошенской район", outpatientTarget: FACILITIES.borovichi },
  { name: "Новгородский район", outpatientTarget: FACILITIES.nokvdOutpatient },
  { name: "Окуловский район", outpatientTarget: FACILITIES.okulovka },
  { name: "Парфинский район", outpatientTarget: FACILITIES.starayaRussa },
  { name: "Пестовский район", outpatientTarget: FACILITIES.pestovo },
  { name: "Поддорский район", outpatientTarget: FACILITIES.starayaRussa },
  { name: "Солецкий округ", outpatientTarget: FACILITIES.shimsk },
  { name: "Старорусский район", outpatientTarget: FACILITIES.starayaRussa },
  { name: "Хвойнинский округ", outpatientTarget: FACILITIES.borovichi },
  { name: "Холмский район", outpatientTarget: FACILITIES.starayaRussa },
  { name: "Чудовский район", outpatientTarget: FACILITIES.chudovo },
  { name: "Шимский район", outpatientTarget: FACILITIES.shimsk },
];

const CONDITION_LABELS: Record<Condition, string> = {
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

function evaluateRouting(state: FormState): RoutingResult | null {
  const territory = TERRITORIES.find((item) => item.name === state.territory);
  if (!territory || !state.condition) return null;

  if (state.condition !== "none") {
    const condition = CONDITION_LABELS[state.condition];
    return {
      title: `${condition}: экстренная госпитализация`,
      target: FACILITIES.nearestIcu,
      afterStabilization: FACILITIES.nokvdInpatient,
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
      target: FACILITIES.nokvdInpatient,
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
      <div className="mt-1 text-sm text-neutral-700">{props.facility.role}</div>
      <div className="mt-2 text-sm font-medium">{props.facility.address}</div>
    </div>
  );
}

function ListBlock(props: { title: string; items: string[] }) {
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

function SourceBlock(props: { sources: Source[] }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="mb-2 text-sm font-semibold">Нормативные источники</div>
      <ul className="list-disc space-y-2 pl-5 text-sm text-neutral-700">
        {props.sources.map((source) => (
          <li key={source.label}>
            {source.url ? (
              <a
                className="text-blue-700 underline underline-offset-2"
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                {source.label}
              </a>
            ) : (
              source.label
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DermatovenerologySMPRoutingWizard() {
  const [state, setState] = useState<FormState>({});
  const result = useMemo(() => evaluateRouting(state), [state]);

  const selectCondition = (condition: Condition) => {
    setState((current) => ({
      ...current,
      condition,
      inpatientCare: condition === "none" ? current.inpatientCare : undefined,
    }));
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-4">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">
            Дерматовенерология — маршрутизация СМП
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Территория и состояние пациента → место оказания помощи.
          </p>
        </header>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <Section title="1. Территория вызова">
              <label
                className="mb-1 block text-sm font-medium"
                htmlFor="derm-territory"
              >
                Муниципальный район или округ
              </label>
              <select
                id="derm-territory"
                className="w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2"
                value={state.territory ?? ""}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    territory: event.currentTarget.value || undefined,
                  }))
                }
              >
                <option value="">Выберите территорию</option>
                {TERRITORIES.map((territory) => (
                  <option key={territory.name} value={territory.name}>
                    {territory.name}
                  </option>
                ))}
              </select>
            </Section>

            <Section title="2. Состояние пациента">
              <p className="mb-3 text-sm text-neutral-600">
                Выберите состояние, которое определяет маршрут.
              </p>
              <div className="space-y-2">
                {(Object.keys(CONDITION_LABELS) as Condition[]).map(
                  (condition) => (
                    <ChoiceButton
                      key={condition}
                      selected={state.condition === condition}
                      onClick={() => selectCondition(condition)}
                    >
                      <span className="font-medium">
                        {CONDITION_LABELS[condition]}
                      </span>
                    </ChoiceButton>
                  ),
                )}
              </div>
            </Section>

            {state.condition === "none" ? (
              <Section title="3. Требуется ли стационарное лечение?">
                <p className="mb-3 text-sm text-neutral-600">
                  Амбулаторная помощь невозможна и есть показания к профильной
                  госпитализации?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <ChoiceButton
                    selected={state.inpatientCare === true}
                    onClick={() =>
                      setState((current) => ({
                        ...current,
                        inpatientCare: true,
                      }))
                    }
                  >
                    <span className="font-medium">Да</span>
                  </ChoiceButton>
                  <ChoiceButton
                    selected={state.inpatientCare === false}
                    onClick={() =>
                      setState((current) => ({
                        ...current,
                        inpatientCare: false,
                      }))
                    }
                  >
                    <span className="font-medium">Нет</span>
                  </ChoiceButton>
                </div>
              </Section>
            ) : null}

            <div className="rounded-3xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
              Осложнённые инфекции, передаваемые половым путём, маршрутизируются
              по профилю осложнения; новорождённые с врождённым сифилисом — в
              акушерский или детский стационар с привлечением дерматовенеролога;
              при подозрении на злокачественное новообразование — в первичный
              онкологический кабинет.
            </div>
          </div>

          <Section title="Итог маршрутизации">
            {!result ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Выберите территорию и состояние пациента. Если опасных состояний
                нет, также укажите, требуется ли стационарное лечение.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-xl font-bold">{result.title}</div>
                  <div className="mt-1 text-sm text-neutral-600">
                    Срочность: {result.urgency}
                  </div>
                  <div className="text-sm text-neutral-600">
                    Транспорт: {result.transport}
                  </div>
                </div>

                <FacilityCard
                  facility={result.target}
                  label="Куда направить пациента"
                />

                {result.afterStabilization ? (
                  <FacilityCard
                    facility={result.afterStabilization}
                    label="После стабилизации — при наличии показаний"
                  />
                ) : null}

                <ListBlock title="Действия СМП" items={result.actions} />
                <ListBlock
                  title="Что передать принимающей стороне"
                  items={result.handoff}
                />
                <SourceBlock sources={result.sources} />
              </div>
            )}
          </Section>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950">
          Региональная схема перенесена из приказа № 98-Д от 01.02.2022. Перед
          использованием в рабочей системе её необходимо сверить с Минздравом
          Новгородской области с учётом действующего федерального приказа
          Минздрава России № 582н от 24.09.2025.
        </div>
      </div>
    </div>
  );
}
