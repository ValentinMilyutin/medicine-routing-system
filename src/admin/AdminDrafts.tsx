import { useEffect, useMemo, useState } from "react";
import {
  validateInfectiousRuleSetForEditor,
  validateRoutingContentDocument,
  validateRoutingRuleSetV1,
  type RoutingProfileId,
  type RoutingRuleSetV1,
} from "../routing";
import { infectiousRoutingContent } from "../routing/content-manifests";
import {
  createAdminRoutingDraft,
  getAdminRoutingVersion,
  listAdminRoutingVersions,
  saveAdminRoutingDraft,
  type StoredRoutingVersion,
  type StoredRoutingVersionSummary,
} from "./admin-content-api";
import InfectiousRuleBuilder from "./InfectiousRuleBuilder";
import InfectiousQuestionnaireBuilder from "./InfectiousQuestionnaireBuilder";

function withDynamicInfectiousQuestions(
  version: StoredRoutingVersion,
): StoredRoutingVersion {
  if (version.profileId !== "infectious") return version;
  const defaults = new Map(
    infectiousRoutingContent.questions.map((question) => [question.id, question]),
  );
  const optionCatalogs: Record<string, string[]> = {
    infectionGroup: ["groupLabels"],
    lifeThreats: ["lifeThreatLabels"],
    admissionCriteria: ["admissionGeneral", "admissionRespiratory"],
  };
  return {
    ...version,
    document: {
      ...version.document,
      questions: version.document.questions.map((question) => {
        const fallback = defaults.get(question.id);
        if (!fallback || question.options !== undefined) return question;
        return {
          ...fallback,
          ...question,
          helpText: question.helpText ?? fallback.helpText,
          placeholder: question.placeholder ?? fallback.placeholder,
          visibility: question.visibility ?? fallback.visibility,
          options: fallback.options?.map((option) => {
            const label = (optionCatalogs[question.id] ?? [])
              .map(
                (catalogId) =>
                  version.ruleSet.catalogs[catalogId]?.[String(option.value)],
              )
              .find((value): value is string => typeof value === "string");
            return label ? { ...option, label } : option;
          }),
        };
      }),
    },
  };
}

function suggestedNextVersion(current: string): string {
  const match = /^(\d+)\.(\d+)\./.exec(current);
  return match
    ? `${match[1]}.${Number(match[2]) + 1}.0-draft.1`
    : "0.4.0-draft.1";
}

export default function AdminDrafts(props: {
  profileId: RoutingProfileId;
  currentVersion: string;
}) {
  const [opened, setOpened] = useState(false);
  const [versions, setVersions] = useState<StoredRoutingVersionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [contentVersion, setContentVersion] = useState(
    suggestedNextVersion(props.currentVersion),
  );
  const [changeSummary, setChangeSummary] = useState("");
  const [working, setWorking] = useState<StoredRoutingVersion | null>(null);
  const [ruleJson, setRuleJson] = useState("");
  const [editableRuleSet, setEditableRuleSet] = useState<RoutingRuleSetV1 | null>(null);

  const profileVersions = useMemo(
    () => versions.filter((version) => version.profileId === props.profileId),
    [props.profileId, versions],
  );

  useEffect(() => {
    setContentVersion(suggestedNextVersion(props.currentVersion));
    setChangeSummary("");
    setWorking(null);
    setRuleJson("");
    setEditableRuleSet(null);
    setError("");
    setNotice("");
  }, [props.currentVersion, props.profileId]);

  async function loadVersions() {
    setOpened(true);
    setLoading(true);
    setError("");
    try {
      setVersions(await listAdminRoutingVersions());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить версии.");
    } finally {
      setLoading(false);
    }
  }

  function openEditor(version: StoredRoutingVersion) {
    const editableVersion = withDynamicInfectiousQuestions(version);
    setWorking(editableVersion);
    setEditableRuleSet(editableVersion.ruleSet);
    setRuleJson(JSON.stringify(editableVersion.ruleSet, null, 2));
    setNotice("");
    setError("");
  }

  async function loadVersion(id: string) {
    setLoading(true);
    setError("");
    try {
      openEditor(await getAdminRoutingVersion(id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось открыть черновик.");
    } finally {
      setLoading(false);
    }
  }

  async function createDraft() {
    if (!contentVersion.trim() || !changeSummary.trim()) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const version = await createAdminRoutingDraft({
        profileId: props.profileId,
        contentVersion: contentVersion.trim(),
        changeSummary: changeSummary.trim(),
      });
      setVersions((current) => [version, ...current]);
      openEditor(version);
      setNotice("Черновик создан. Исходная опубликованная логика не изменена.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось создать черновик.");
    } finally {
      setLoading(false);
    }
  }

  async function saveDraft() {
    if (!working) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const ruleSet: unknown =
        working.profileId === "infectious" && editableRuleSet
          ? editableRuleSet
          : JSON.parse(ruleJson);
      const saved = await saveAdminRoutingDraft({
        ...working,
        ruleSet: ruleSet as StoredRoutingVersion["ruleSet"],
      });
      openEditor(saved);
      setVersions((current) => [
        saved,
        ...current.filter((item) => item.id !== saved.id),
      ]);
      setNotice(`Сохранена ревизия ${saved.revision}.`);
    } catch (reason) {
      setError(
        reason instanceof SyntaxError
          ? "В техническом JSON правил допущена синтаксическая ошибка."
          : reason instanceof Error
            ? reason.message
            : "Не удалось сохранить черновик.",
      );
    } finally {
      setLoading(false);
    }
  }

  const editableRuleIssues = useMemo(
    () =>
      editableRuleSet
        ? editableRuleSet.profileId === "infectious"
          ? validateInfectiousRuleSetForEditor(
              editableRuleSet,
              working?.document.questions,
            )
          : validateRoutingRuleSetV1(editableRuleSet)
        : [],
    [editableRuleSet, working?.document.questions],
  );
  const editableDocumentIssues = useMemo(
    () => (working ? validateRoutingContentDocument(working.document) : []),
    [working],
  );

  if (!opened) {
    return (
      <button
        type="button"
        onClick={loadVersions}
        className="mt-5 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold hover:bg-neutral-50"
      >
        Открыть версии и черновики
      </button>
    );
  }

  return (
    <div className="mt-5 space-y-4 border-t border-neutral-200 pt-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">Версии в Neon</h3>
        <button
          type="button"
          onClick={loadVersions}
          disabled={loading}
          className="text-xs text-blue-700 underline disabled:opacity-50"
        >
          Обновить
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 p-4">
        <div className="font-medium">Создать отдельный черновик</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-neutral-600">Новая версия</span>
            <input
              value={contentVersion}
              onChange={(event) => setContentVersion(event.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-neutral-600">Что планируется изменить</span>
            <input
              value={changeSummary}
              onChange={(event) => setChangeSummary(event.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={createDraft}
          disabled={loading || !contentVersion.trim() || !changeSummary.trim()}
          className="mt-3 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Создать черновик
        </button>
      </div>

      <div>
        <div className="text-sm font-medium">Сохранённые версии профиля</div>
        {profileVersions.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">В базе пока нет версий этого профиля.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {profileVersions.map((version) => (
              <button
                key={version.id}
                type="button"
                onClick={() => loadVersion(version.id)}
                className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 p-3 text-left hover:bg-neutral-50"
              >
                <span>
                  <span className="block text-sm font-medium">{version.contentVersion}</span>
                  <span className="text-xs text-neutral-500">{version.status} · ревизия {version.revision}</span>
                </span>
                <span className="text-xs text-blue-700">Открыть</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {working && (
        <div className="space-y-4 rounded-2xl border-2 border-neutral-300 p-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-500">Редактор черновика</div>
            <div className="font-semibold">{working.contentVersion} · ревизия {working.revision}</div>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Описание изменений</span>
            <textarea
              value={working.document.changeSummary}
              onChange={(event) =>
                setWorking({
                  ...working,
                  document: { ...working.document, changeSummary: event.target.value },
                })
              }
              rows={2}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2"
            />
          </label>

          {working.profileId !== "infectious" ? <details>
            <summary className="cursor-pointer text-sm font-semibold">Подписи вопросов ({working.document.questions.length})</summary>
            <div className="mt-3 space-y-2">
              {working.document.questions.map((question, index) => (
                <label key={question.id} className="block text-xs text-neutral-500">
                  {question.id}
                  <input
                    value={question.label}
                    onChange={(event) =>
                      setWorking({
                        ...working,
                        document: {
                          ...working.document,
                          questions: working.document.questions.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, label: event.target.value } : item,
                          ),
                        },
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
                  />
                </label>
              ))}
            </div>
          </details> : null}

          <details>
            <summary className="cursor-pointer text-sm font-semibold">Клинические исходы — обзор ({working.document.branches.length})</summary>
            <div className="mt-3 space-y-3">
              {working.document.branches.map((branch, index) => (
                <div key={branch.id} className="rounded-xl bg-neutral-50 p-3">
                  <div className="text-xs text-neutral-500">{branch.id} · приоритет {branch.priority}</div>
                  {(["title", "conditionSummary", "outcomeSummary"] as const).map((field) => (
                    <label key={field} className="mt-2 block text-xs text-neutral-500">
                      {field === "title" ? "Название" : field === "conditionSummary" ? "Условие" : "Результат"}
                      <textarea
                        value={branch[field]}
                        onChange={(event) =>
                          setWorking({
                            ...working,
                            document: {
                              ...working.document,
                              branches: working.document.branches.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, [field]: event.target.value } : item,
                              ),
                            },
                          })
                        }
                        rows={field === "title" ? 1 : 2}
                        className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
                      />
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </details>

          <details>
            <summary className="cursor-pointer text-sm font-semibold">Официальные источники ({working.document.sources.length})</summary>
            <div className="mt-3 space-y-3">
              {working.document.sources.map((source, index) => (
                <div key={source.id} className="rounded-xl bg-neutral-50 p-3">
                  <div className="text-xs text-neutral-500">{source.id}</div>
                  <input
                    aria-label={`Название источника ${source.id}`}
                    value={source.label}
                    onChange={(event) =>
                      setWorking({
                        ...working,
                        document: {
                          ...working.document,
                          sources: working.document.sources.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, label: event.target.value } : item,
                          ),
                        },
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>
          </details>

          {working.profileId === "infectious" && editableRuleSet ? (
            <>
              <InfectiousQuestionnaireBuilder
                questions={working.document.questions}
                ruleSet={editableRuleSet}
                onChange={(questions, nextRuleSet) => {
                  setWorking({
                    ...working,
                    document: { ...working.document, questions },
                  });
                  setEditableRuleSet(nextRuleSet);
                  setRuleJson(JSON.stringify(nextRuleSet, null, 2));
                }}
              />
              <InfectiousRuleBuilder
                ruleSet={editableRuleSet}
                questions={working.document.questions}
                onChange={(next) => {
                  setEditableRuleSet(next);
                  setRuleJson(JSON.stringify(next, null, 2));
                }}
              />
              <details>
                <summary className="cursor-pointer text-sm font-semibold">Технический JSON — только просмотр</summary>
                <textarea
                  aria-label="JSON исполняемых правил"
                  value={ruleJson}
                  readOnly
                  rows={18}
                  spellCheck={false}
                  className="mt-2 w-full rounded-xl border border-neutral-300 bg-neutral-950 px-3 py-2 font-mono text-xs text-neutral-100"
                />
              </details>
            </>
          ) : (
            <details>
              <summary className="cursor-pointer text-sm font-semibold">Исполняемые правила — технический JSON</summary>
              <p className="mt-2 text-xs text-amber-800">
                Для этого профиля визуальный конструктор ещё не подключён. Сервер проверит структуру и запрещённые конструкции.
              </p>
              <textarea
                aria-label="JSON исполняемых правил"
                value={ruleJson}
                onChange={(event) => setRuleJson(event.target.value)}
                rows={18}
                spellCheck={false}
                className="mt-2 w-full rounded-xl border border-neutral-300 bg-neutral-950 px-3 py-2 font-mono text-xs text-neutral-100"
              />
            </details>
          )}

          {editableDocumentIssues.length > 0 ? (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <div className="font-semibold">
                Документ черновика содержит ошибок: {editableDocumentIssues.length}
              </div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
                {editableDocumentIssues.slice(0, 12).map((issue) => (
                  <li key={`${issue.path}-${issue.message}`}>
                    <span className="font-mono">{issue.path}</span>: {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <button
            type="button"
            onClick={saveDraft}
            disabled={
              loading ||
              editableDocumentIssues.length > 0 ||
              (working.profileId === "infectious" && editableRuleIssues.length > 0)
            }
            className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {loading ? "Сохранение…" : "Сохранить новую ревизию"}
          </button>
        </div>
      )}
    </div>
  );
}
