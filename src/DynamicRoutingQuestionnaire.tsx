import type { RoutingQuestionDescriptor } from "./routing/content-schema.js";
import {
  routingQuestionOptions,
  setRoutingQuestionAnswer,
  visibleRoutingQuestions,
  type RoutingQuestionnaireState,
} from "./routing/index.js";

function ChoiceButton(props: {
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`w-full rounded-2xl border p-3 text-left text-sm font-medium transition ${
        props.selected
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-200 bg-white hover:bg-neutral-50"
      }`}
    >
      {props.label}
    </button>
  );
}

function sameValue(left: unknown, right: unknown) {
  return Object.is(left, right);
}

export default function DynamicRoutingQuestionnaire(props: {
  questions: readonly RoutingQuestionDescriptor[];
  state: RoutingQuestionnaireState;
  onChange: (state: RoutingQuestionnaireState) => void;
  compact?: boolean;
}) {
  const visible = visibleRoutingQuestions(props.questions, props.state);

  return (
    <div className="space-y-4">
      {visible.map((question, index) => {
        const options = routingQuestionOptions(question, props.state);
        const value = props.state[question.id];
        const setAnswer = (nextValue: unknown) =>
          props.onChange(
            setRoutingQuestionAnswer(
              props.questions,
              props.state,
              question.id,
              nextValue,
            ),
          );

        return (
          <section
            key={question.id}
            data-question-id={question.id}
            className={`rounded-3xl border border-neutral-200 bg-white shadow-sm ${
              props.compact ? "p-4" : "p-5"
            }`}
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <h2 className="text-lg font-bold">
                {index + 1}. {question.label}
              </h2>
              {question.requirement === "optional" ? (
                <span className="rounded-full bg-neutral-100 px-2 py-1 text-[11px] text-neutral-600">
                  Необязательно
                </span>
              ) : null}
            </div>
            {question.helpText ? (
              <p className="mb-3 text-sm text-neutral-600">
                {question.helpText}
              </p>
            ) : null}

            {question.kind === "text" ? (
              <textarea
                aria-label={question.label}
                value={typeof value === "string" ? value : ""}
                placeholder={question.placeholder}
                rows={3}
                onChange={(event) => setAnswer(event.currentTarget.value)}
                className="w-full rounded-2xl border border-neutral-300 px-3 py-2"
              />
            ) : question.kind === "number" ? (
              <input
                aria-label={question.label}
                type="number"
                value={typeof value === "number" ? value : ""}
                placeholder={question.placeholder}
                onChange={(event) =>
                  setAnswer(
                    event.currentTarget.value === ""
                      ? undefined
                      : Number(event.currentTarget.value),
                  )
                }
                className="w-full rounded-2xl border border-neutral-300 px-3 py-2"
              />
            ) : question.kind === "multiple_choice" ? (
              <div className="space-y-2">
                {options.map((option) => {
                  const selected =
                    Array.isArray(value) &&
                    value.some((item) => sameValue(item, option.value));
                  return (
                    <label
                      key={JSON.stringify(option.value)}
                      className="flex cursor-pointer gap-3 rounded-2xl border border-neutral-200 p-3 hover:bg-neutral-50"
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 shrink-0"
                        checked={selected}
                        onChange={() => setAnswer(option.value)}
                      />
                      <span>
                        <span className="block text-sm font-medium">
                          {option.label}
                        </span>
                        {option.helpText ? (
                          <span className="mt-1 block text-xs text-neutral-500">
                            {option.helpText}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : options.length > 8 ? (
              <select
                aria-label={question.label}
                value={
                  value === undefined || value === null ? "" : String(value)
                }
                onChange={(event) => {
                  const option = options.find(
                    (item) => String(item.value) === event.currentTarget.value,
                  );
                  setAnswer(option?.value);
                }}
                className="w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2"
              >
                <option value="">{question.placeholder ?? "Выберите вариант"}</option>
                {options.map((option) => (
                  <option
                    key={JSON.stringify(option.value)}
                    value={String(option.value)}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-2">
                {options.map((option) => (
                  <ChoiceButton
                    key={JSON.stringify(option.value)}
                    selected={sameValue(value, option.value)}
                    label={option.label}
                    onClick={() => setAnswer(option.value)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
