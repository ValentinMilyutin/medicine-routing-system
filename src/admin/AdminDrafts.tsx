import { useEffect, useMemo, useRef, useState } from "react";
import {
  compareRoutingVersions,
  hydrateLegacyRoutingQuestions,
  publicationBlockers,
  validateInfectiousPublicationReadiness,
  validateInfectiousRuleSetForEditor,
  validateRoutingPublicationReadiness,
  validateRoutingRuleSetForEditor,
  validateRoutingContentDocument,
  validateRoutingRuleSetV1,
  type RoutingProfileId,
  type RoutingProfileContentDocument,
  type RoutingQuestionnaireState,
  type RoutingRuleSetV1,
} from "../routing";
import {
  approveAdminRoutingVersion,
  archiveAdminRoutingVersion,
  createAdminRoutingDraft,
  getAdminEffectiveRoutingVersion,
  getAdminRoutingVersion,
  listAdminRoutingVersions,
  saveAdminRoutingDraft,
  submitAdminRoutingVersionForReview,
  type StoredRoutingVersion,
  type StoredRoutingVersionSummary,
  type EffectiveRoutingVersion,
} from "./admin-content-api";
import InfectiousRuleBuilder from "./InfectiousRuleBuilder";
import InfectiousQuestionnaireBuilder from "./InfectiousQuestionnaireBuilder";
import InfectiousVersionPreview from "./InfectiousVersionPreview";
import InfectiousControlCaseBuilder from "./InfectiousControlCaseBuilder";
import RoadAccidentRuleBuilder from "./RoadAccidentRuleBuilder";
import RoutingVersionPreview from "./RoutingVersionPreview";
import FacilityRuleBuilder from "./FacilityRuleBuilder";
import RoutingVersionComparison from "./RoutingVersionComparison";

const STATUS_LABELS = {
  draft: "Черновик",
  in_review: "На проверке",
  approved: "Опубликована",
  archived: "В архиве",
} as const;

function supportsVisualEditor(profileId: RoutingProfileId): boolean {
  return profileId === "infectious" || profileId === "road_accident" || profileId === "dermatology" || profileId === "bsk" || profileId === "oncology" || profileId === "obgyn";
}

function withDynamicRoutingQuestions(
  version: StoredRoutingVersion,
): StoredRoutingVersion {
  return {
    ...version,
    document: hydrateLegacyRoutingQuestions(version.document, version.ruleSet),
  };
}

function syncBranchDescriptors(
  document: RoutingProfileContentDocument,
  ruleSet: RoutingRuleSetV1,
  previousRuleSet?: RoutingRuleSetV1,
): RoutingProfileContentDocument {
  const previous = new Map(document.branches.map((branch) => [branch.id, branch]));
  const previousRules = new Map(
    previousRuleSet?.rules.map((rule) => [rule.id, rule]) ?? [],
  );
  const nextRuleIds = new Set(ruleSet.rules.map((rule) => rule.id));
  const defaultSourceIds = document.sources.map((source) => source.id);
  const synchronized = document.branches
    .filter((branch) => !previousRules.has(branch.id) || nextRuleIds.has(branch.id))
    .map((branch) => {
      const rule = ruleSet.rules.find((candidate) => candidate.id === branch.id);
      if (!rule) return branch;
      const result = typeof rule.result === "object" && rule.result !== null && !Array.isArray(rule.result)
        ? rule.result as Record<string, unknown>
        : {};
      return {
        ...branch,
        title: typeof result.title === "string" ? result.title : branch.title,
        priority: rule.priority,
      };
    });
  const synchronizedIds = new Set(synchronized.map((branch) => branch.id));
  const addedOrChangedRules = ruleSet.rules.filter((rule) => {
    if (synchronizedIds.has(rule.id)) return false;
    const before = previousRules.get(rule.id);
    return !before || JSON.stringify(before) !== JSON.stringify(rule);
  });
  return {
    ...document,
    branches: [
      ...synchronized,
      ...addedOrChangedRules.map((rule) => {
        const existing = previous.get(rule.id);
        const result = typeof rule.result === "object" && rule.result !== null && !Array.isArray(rule.result)
          ? rule.result as Record<string, unknown>
          : {};
        return {
          id: rule.id,
          title: typeof result.title === "string" ? result.title : (existing?.title ?? rule.id),
          priority: rule.priority,
          conditionSummary: existing?.conditionSummary ?? "Условие настроено в визуальном конструкторе.",
          outcomeSummary: existing?.outcomeSummary ?? "Пункт назначения определяется исполняемым результатом ветки.",
          sourceIds: existing?.sourceIds ?? defaultSourceIds,
          curatorQuestionIds: existing?.curatorQuestionIds ?? [],
        };
      }),
    ].sort((left, right) => left.priority - right.priority),
  };
}

function suggestedNextVersion(current: string): string {
  const match = /^(\d+)\.(\d+)\./.exec(current);
  return match
    ? `${match[1]}.${Number(match[2]) + 1}.0-draft.1`
    : "0.4.0-draft.1";
}

function suggestedAvailableVersion(
  current: string,
  versions: readonly StoredRoutingVersionSummary[],
): string {
  const used = new Set(versions.map((version) => version.contentVersion));
  let candidate = suggestedNextVersion(current);
  let attempts = 0;
  while (used.has(candidate) && attempts < 100) {
    candidate = suggestedNextVersion(candidate);
    attempts += 1;
  }
  return candidate;
}

export default function AdminDrafts(props: {
  profileId: RoutingProfileId;
  currentVersion: string;
}) {
  const [opened, setOpened] = useState(false);
  const [versions, setVersions] = useState<StoredRoutingVersionSummary[]>([]);
  const [versionDetails, setVersionDetails] = useState<
    Record<string, StoredRoutingVersion>
  >({});
  const [effectiveVersion, setEffectiveVersion] =
    useState<EffectiveRoutingVersion | null>(null);
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
  const [decisionDocument, setDecisionDocument] = useState("");
  const [previewCurrent, setPreviewCurrent] = useState(false);
  const [previewSelected, setPreviewSelected] = useState(false);
  const [inspectionState, setInspectionState] =
    useState<RoutingQuestionnaireState | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const workingId = working?.id;

  const profileVersions = useMemo(
    () => versions.filter((version) => version.profileId === props.profileId),
    [props.profileId, versions],
  );
  const candidateVersions = useMemo(
    () =>
      profileVersions.filter(
        (version) => version.status === "draft" || version.status === "in_review",
      ),
    [profileVersions],
  );
  const historyVersions = useMemo(
    () => profileVersions.filter((version) => version.status === "archived"),
    [profileVersions],
  );

  useEffect(() => {
    setContentVersion(suggestedNextVersion(props.currentVersion));
    setChangeSummary("");
    setWorking(null);
    setRuleJson("");
    setEditableRuleSet(null);
    setDecisionDocument("");
    setEffectiveVersion(null);
    setVersionDetails({});
    setPreviewCurrent(false);
    setPreviewSelected(false);
    setInspectionState(null);
    setError("");
    setNotice("");
  }, [props.currentVersion, props.profileId]);

  useEffect(() => {
    if (
      workingId &&
      typeof editorRef.current?.scrollIntoView === "function"
    ) {
      editorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [workingId]);

  async function loadVersions() {
    setOpened(true);
    setLoading(true);
    setError("");
    try {
      const [allVersions, effective] = await Promise.all([
        listAdminRoutingVersions(),
        getAdminEffectiveRoutingVersion(props.profileId),
      ]);
      const profileItems = allVersions.filter(
        (version) => version.profileId === props.profileId,
      );
      const detailResults = await Promise.allSettled(
        profileItems.map((version) => getAdminRoutingVersion(version.id)),
      );
      const details: Record<string, StoredRoutingVersion> = {};
      detailResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          const hydrated = withDynamicRoutingQuestions(result.value);
          details[hydrated.id] = hydrated;
        } else {
          console.error(
            `Не удалось подготовить версию ${profileItems[index]?.id ?? "?"}`,
            result.reason,
          );
        }
      });
      setVersions(allVersions);
      setEffectiveVersion({
        ...effective,
        document: hydrateLegacyRoutingQuestions(
          effective.document,
          effective.ruleSet,
        ),
      });
      setVersionDetails(details);
      setContentVersion(
        suggestedAvailableVersion(effective.contentVersion, profileItems),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить версии.");
    } finally {
      setLoading(false);
    }
  }

  function openEditor(version: StoredRoutingVersion) {
    const editableVersion = withDynamicRoutingQuestions(version);
    setWorking(editableVersion);
    setEditableRuleSet(editableVersion.ruleSet);
    setRuleJson(JSON.stringify(editableVersion.ruleSet, null, 2));
    setNotice("");
    setError("");
    setDecisionDocument(editableVersion.document.approval?.decisionDocument ?? "");
    setPreviewSelected(false);
    setInspectionState(null);
  }

  function replaceVersion(version: StoredRoutingVersion) {
    setVersions((current) => [
      version,
      ...current.filter((item) => item.id !== version.id),
    ]);
    setVersionDetails((current) => ({ ...current, [version.id]: version }));
    openEditor(version);
  }

  function ruleSetForSave(): StoredRoutingVersion["ruleSet"] {
    if (!working) throw new Error("Версия не открыта.");
    return (supportsVisualEditor(working.profileId) && editableRuleSet
      ? editableRuleSet
      : JSON.parse(ruleJson)) as StoredRoutingVersion["ruleSet"];
  }

  async function loadVersion(id: string) {
    setLoading(true);
    setError("");
    try {
      openEditor(versionDetails[id] ?? (await getAdminRoutingVersion(id)));
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
      setVersionDetails((current) => ({ ...current, [version.id]: version }));
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
        supportsVisualEditor(working.profileId) && editableRuleSet
          ? editableRuleSet
          : JSON.parse(ruleJson);
      const saved = await saveAdminRoutingDraft({
        ...working,
        ruleSet: ruleSet as StoredRoutingVersion["ruleSet"],
      });
      openEditor(saved);
      setVersionDetails((current) => ({ ...current, [saved.id]: saved }));
      setVersions((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
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

  async function submitForReview() {
    if (!working || working.status !== "draft") return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const saved = await saveAdminRoutingDraft({
        ...working,
        ruleSet: ruleSetForSave(),
      });
      const submitted = await submitAdminRoutingVersionForReview(saved);
      replaceVersion(submitted);
      setNotice(
        "Версия сохранена и передана на проверку. С этого момента редактор заблокирован.",
      );
    } catch (reason) {
      setError(
        reason instanceof SyntaxError
          ? "В техническом JSON правил допущена синтаксическая ошибка."
          : reason instanceof Error
            ? reason.message
            : "Не удалось передать версию на проверку.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function approveVersion() {
    if (!working || working.status !== "in_review") return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const approved = await approveAdminRoutingVersion(
        working,
        decisionDocument.trim(),
      );
      replaceVersion(approved);
      await loadVersions();
      setNotice(
        "Версия опубликована. Предыдущая опубликованная версия автоматически перенесена в архив.",
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось опубликовать версию.");
    } finally {
      setLoading(false);
    }
  }

  async function archiveVersion() {
    if (!working || working.status !== "approved") return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const archived = await archiveAdminRoutingVersion(working);
      replaceVersion(archived);
      await loadVersions();
      setNotice("Версия перенесена в архив и больше не выдаётся публичному профилю.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось архивировать версию.");
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
          : supportsVisualEditor(editableRuleSet.profileId)
            ? validateRoutingRuleSetForEditor(
                editableRuleSet,
                working?.document.questions,
                editableRuleSet.profileId,
              )
            : validateRoutingRuleSetV1(editableRuleSet)
        : [],
    [editableRuleSet, working?.document.questions],
  );
  const editableDocumentIssues = useMemo(
    () => (working ? validateRoutingContentDocument(working.document) : []),
    [working],
  );
  const publicationQuestions = working?.document.questions;
  const publicationControlCases = working?.document.controlCases;
  const editablePublicationIssues = useMemo(
    () => {
      if (
        working?.profileId &&
      supportsVisualEditor(working.profileId) &&
      editableRuleSet &&
      publicationQuestions
      ) {
        if (!publicationControlCases || publicationControlCases.length === 0) {
          return [{ path: "controlCases", message: "Добавьте контрольные примеры для исполняемых веток." }];
        }
        return (working.profileId === "infectious"
          ? validateInfectiousPublicationReadiness
          : validateRoutingPublicationReadiness)(
          publicationQuestions,
          editableRuleSet,
          publicationControlCases,
        );
      }
      return [];
    },
    [
      editableRuleSet,
      publicationControlCases,
      publicationQuestions,
      working?.profileId,
    ],
  );
  const activePublicationBlockers = useMemo(
    () =>
      working
        ? [
            ...publicationBlockers(working.document),
            ...editablePublicationIssues.map(
              (issue) => `${issue.path}: ${issue.message}`,
            ),
          ]
        : [],
    [editablePublicationIssues, working],
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
        <h3 className="font-semibold">Управление версиями</h3>
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

      {effectiveVersion ? (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Текущая рабочая версия
              </div>
              <div className="mt-1 font-semibold">{effectiveVersion.contentVersion}</div>
              <div className="mt-1 text-xs text-emerald-900">
                {effectiveVersion.kind === "approved"
                  ? "Утверждена и выдаётся публичному профилю."
                  : "Встроенная резервная версия. Ещё не утверждена через административный контур."}
              </div>
            </div>
            {supportsVisualEditor(props.profileId) ? (
              <button
                type="button"
                onClick={() => setPreviewCurrent((current) => !current)}
                className="rounded-xl border border-emerald-400 bg-white px-3 py-2 text-xs font-medium text-emerald-900"
              >
                {previewCurrent ? "Закрыть предпросмотр" : "Посмотреть текущую"}
              </button>
            ) : null}
          </div>
        </div>
      ) : loading ? (
        <div className="text-sm text-neutral-500">Загрузка текущей версии…</div>
      ) : null}

      {previewCurrent && effectiveVersion && supportsVisualEditor(props.profileId) ? (
        props.profileId === "infectious" ? (
          <InfectiousVersionPreview
            key={effectiveVersion.id}
            document={effectiveVersion.document}
            ruleSet={effectiveVersion.ruleSet}
          />
        ) : (
          <RoutingVersionPreview
            key={effectiveVersion.id}
            document={effectiveVersion.document}
            ruleSet={effectiveVersion.ruleSet}
          />
        )
      ) : null}

      <div className="rounded-2xl border border-neutral-200 p-4">
        <div className="font-medium">Создать кандидат на изменение</div>
        <p className="mt-1 text-xs text-neutral-500">
          Новый черновик всегда создаётся на основе текущей рабочей версии.
        </p>
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
        <div className="text-sm font-medium">Кандидаты</div>
        <p className="mt-1 text-xs text-neutral-500">
          Каждый вариант ниже сравнивается только с текущей рабочей версией.
        </p>
        {candidateVersions.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Активных черновиков пока нет.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {candidateVersions.map((version) => {
              const detail = versionDetails[version.id];
              const diff =
                detail && effectiveVersion
                  ? compareRoutingVersions(
                      effectiveVersion.document,
                      effectiveVersion.ruleSet,
                      detail.document,
                      detail.ruleSet,
                    )
                  : null;
              const stale =
                effectiveVersion &&
                version.basedOnContentVersion &&
                version.basedOnContentVersion !== effectiveVersion.contentVersion;
              return (
                <button
                  key={version.id}
                  type="button"
                  onClick={() => loadVersion(version.id)}
                  className={`w-full rounded-2xl border p-3 text-left hover:bg-neutral-50 ${
                    working?.id === version.id
                      ? "border-violet-500 bg-violet-50"
                      : "border-neutral-200"
                  }`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block text-sm font-medium">{version.contentVersion}</span>
                      <span className="mt-1 block text-xs text-neutral-500">
                        {STATUS_LABELS[version.status]} · ревизия {version.revision} · основа{" "}
                        {version.basedOnContentVersion ?? props.currentVersion}
                      </span>
                      {stale ? (
                        <span className="mt-1 block text-xs font-medium text-amber-800">
                          Основан на прежней рабочей версии
                        </span>
                      ) : null}
                      {diff ? (
                        <span className="mt-2 block text-xs text-neutral-700">
                          Логика: {diff.counts.routing} · вопросы: {diff.counts.questions} ·
                          источники: {diff.counts.sources}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-xs font-medium text-blue-700">
                      Выбрать и посмотреть
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {historyVersions.length > 0 ? (
        <details>
          <summary className="cursor-pointer text-sm font-medium">
            История заменённых версий ({historyVersions.length})
          </summary>
          <div className="mt-2 space-y-2">
            {historyVersions.map((version) => (
              <button
                key={version.id}
                type="button"
                onClick={() => loadVersion(version.id)}
                className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 p-3 text-left hover:bg-neutral-50"
              >
                <span>
                  <span className="block text-sm font-medium">{version.contentVersion}</span>
                  <span className="text-xs text-neutral-500">
                    Архив · ревизия {version.revision}
                  </span>
                </span>
                <span className="text-xs text-blue-700">Посмотреть</span>
              </button>
            ))}
          </div>
        </details>
      ) : null}

      {working && (
        <div ref={editorRef} className="scroll-mt-4 space-y-4 rounded-2xl border-2 border-neutral-300 p-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-500">
              {working.status === "draft"
                ? "Редактор черновика"
                : STATUS_LABELS[working.status]}
            </div>
            <div className="font-semibold">
              {working.contentVersion} · ревизия {working.revision}
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              Основа: {working.basedOnContentVersion ?? props.currentVersion}
            </div>
          </div>

          {effectiveVersion ? (
            <RoutingVersionComparison
              current={effectiveVersion}
              candidate={working}
              onInspectScenario={(state) => {
                setInspectionState(state);
                setPreviewSelected(true);
              }}
            />
          ) : null}

          {supportsVisualEditor(working.profileId) ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPreviewSelected((current) => !current)}
                className="rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-800"
              >
                {previewSelected ? "Закрыть предпросмотр" : "Посмотреть как опросник"}
              </button>
            </div>
          ) : null}

          {previewSelected && supportsVisualEditor(working.profileId) && editableRuleSet ? (
            working.profileId === "infectious" ? (
              <InfectiousVersionPreview
                key={`${working.id}-${working.revision}-${JSON.stringify(inspectionState)}`}
                document={working.document}
                ruleSet={editableRuleSet}
                initialState={inspectionState ?? undefined}
              />
            ) : (
              <RoutingVersionPreview
                key={`${working.id}-${working.revision}-${JSON.stringify(inspectionState)}`}
                document={working.document}
                ruleSet={editableRuleSet}
                initialState={inspectionState ?? undefined}
              />
            )
          ) : null}

          {working.status !== "draft" ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              Содержимое этой версии защищено от изменений. Если после проверки
              нужны исправления, создайте на её основе новую версию-черновик.
            </div>
          ) : null}

          {working.status === "draft" ? (
            <>
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

          {!supportsVisualEditor(working.profileId) ? <details>
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
                  <div className="text-xs text-neutral-500">
                    {source.id} · {source.authority === "federal" ? "федеральный" : "региональный"}
                  </div>
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
                  <label className="mt-2 block text-xs text-neutral-600">
                    Ссылка на официальный источник
                    <input
                      value={source.url ?? ""}
                      onChange={(event) =>
                        setWorking({
                          ...working,
                          document: {
                            ...working.document,
                            sources: working.document.sources.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, url: event.target.value || undefined }
                                : item,
                            ),
                          },
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
                    />
                  </label>
                  <label className="mt-2 block text-xs text-neutral-600">
                    Результат проверки
                    <select
                      value={source.verificationStatus}
                      onChange={(event) =>
                        setWorking({
                          ...working,
                          document: {
                            ...working.document,
                            sources: working.document.sources.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    verificationStatus: event.target.value as typeof item.verificationStatus,
                                  }
                                : item,
                            ),
                          },
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                    >
                      <option value="verified">Проверен и действует</option>
                      <option value="needs_confirmation">Требует подтверждения</option>
                      <option value="season_expired">Сезон действия истёк</option>
                    </select>
                  </label>
                </div>
              ))}
            </div>
          </details>

          <details open={working.document.blockingCuratorQuestionIds.length > 0}>
            <summary className="cursor-pointer text-sm font-semibold">
              Вопросы к куратору ({working.document.blockingCuratorQuestionIds.length})
            </summary>
            <p className="mt-2 text-xs text-neutral-600">
              Отмечайте вопрос решённым только после того, как официальный ответ
              отражён в вопросах, ветках и источниках этой версии.
            </p>
            <div className="mt-3 space-y-2">
              {working.document.blockingCuratorQuestionIds.length === 0 ? (
                <div className="text-sm text-emerald-700">Открытых вопросов нет.</div>
              ) : (
                working.document.blockingCuratorQuestionIds.map((questionId) => (
                  <div
                    key={questionId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 p-3"
                  >
                    <span className="font-mono text-xs text-violet-950">{questionId}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setWorking({
                          ...working,
                          document: {
                            ...working.document,
                            blockingCuratorQuestionIds:
                              working.document.blockingCuratorQuestionIds.filter(
                                (id) => id !== questionId,
                              ),
                            branches: working.document.branches.map((branch) => ({
                              ...branch,
                              curatorQuestionIds: branch.curatorQuestionIds.filter(
                                (id) => id !== questionId,
                              ),
                            })),
                          },
                        })
                      }
                      className="rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-medium text-violet-900"
                    >
                      Отметить решённым
                    </button>
                  </div>
                ))
              )}
            </div>
          </details>

          {supportsVisualEditor(working.profileId) && editableRuleSet ? (
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
              {working.profileId === "infectious" ? (
                <InfectiousRuleBuilder
                  ruleSet={editableRuleSet}
                  questions={working.document.questions}
                  onChange={(next) => {
                    setWorking({
                      ...working,
                      document: syncBranchDescriptors(working.document, next, editableRuleSet),
                    });
                    setEditableRuleSet(next);
                    setRuleJson(JSON.stringify(next, null, 2));
                  }}
                />
              ) : working.profileId === "road_accident" ? (
                <RoadAccidentRuleBuilder
                  ruleSet={editableRuleSet}
                  questions={working.document.questions}
                  onChange={(next) => {
                    setWorking({
                      ...working,
                      document: syncBranchDescriptors(working.document, next, editableRuleSet),
                    });
                    setEditableRuleSet(next);
                    setRuleJson(JSON.stringify(next, null, 2));
                  }}
                />
              ) : working.profileId === "dermatology" ? (
                <FacilityRuleBuilder
                  profileId="dermatology"
                  title="Дерматовенерология"
                  ruleSet={editableRuleSet}
                  questions={working.document.questions}
                  tables={[
                    {
                      catalogId: "territories",
                      label: "Амбулаторные назначения по территории",
                      key: { $field: "territory" },
                    },
                  ]}
                  secondaryTargetField="afterStabilization"
                  secondaryTargetLabelField="afterStabilizationLabel"
                  listFields={[
                    { field: "actions", label: "Действия СМП" },
                    { field: "handoff", label: "Что передать принимающей стороне" },
                    { field: "sources", label: "Нормативные основания", structured: true },
                  ]}
                  newRuleSourcesStructured
                  onChange={(next) => {
                    setWorking({
                      ...working,
                      document: syncBranchDescriptors(working.document, next, editableRuleSet),
                    });
                    setEditableRuleSet(next);
                    setRuleJson(JSON.stringify(next, null, 2));
                  }}
                />
              ) : working.profileId === "bsk" ? (
                <FacilityRuleBuilder
                  profileId="bsk"
                  title="БСК / ССЗ"
                  ruleSet={editableRuleSet}
                  questions={working.document.questions}
                  tables={[
                    { catalogId: "strokeZoneTargets", label: "ОНМК по территории", key: { $field: "territory" } },
                    { catalogId: "acsZoneTargets", label: "ОКС по территории", key: { $field: "territory" } },
                    { catalogId: "otherCvdTargets", label: "Другие острые ССЗ по территории", key: { $field: "territory" } },
                    { catalogId: "kinkSurgeryTargets", label: "Хирургический маршрут КИНК", key: { $field: "territory" } },
                  ]}
                  secondaryTargetField="alternative"
                  listFields={[
                    { field: "notify", label: "Кого предупредить" },
                    { field: "checklist", label: "Чек-лист СМП" },
                    { field: "handoff", label: "Что передать принимающей стороне" },
                    { field: "sources", label: "Нормативные основания" },
                    { field: "warnings", label: "Предупреждения" },
                  ]}
                  includeFacilityId
                  onChange={(next) => {
                    setWorking({
                      ...working,
                      document: syncBranchDescriptors(working.document, next, editableRuleSet),
                    });
                    setEditableRuleSet(next);
                    setRuleJson(JSON.stringify(next, null, 2));
                  }}
                />
              ) : working.profileId === "oncology" ? (
                <FacilityRuleBuilder
                  profileId="oncology"
                  title="Онкология"
                  ruleSet={editableRuleSet}
                  questions={working.document.questions}
                  facilityCatalogId="primaryByTerritory"
                  facilityMirrorFields={{ name: "primaryNames", address: "primaryAddresses" }}
                  primaryTargetField="locationPrimaryHospital"
                  resultTitleField="routeTitle"
                  tables={[
                    { catalogId: "primaryByTerritory", label: "Опорная медицинская организация по территории", key: { $field: "territoryKey" } },
                  ]}
                  textFields={[
                    { field: "routeTitle", label: "Название результата" },
                    { field: "target", label: "Решение для бригады", rows: 3 },
                    { field: "transport", label: "Порядок транспортировки", rows: 3 },
                  ]}
                  listFields={[
                    { field: "callouts", label: "Пояснения бригаде" },
                    { field: "uncertainties", label: "Неопределённости и согласования" },
                    { field: "sources", label: "Нормативные основания" },
                  ]}
                  newRuleResult={{
                    route: "medical_transport_non_emergency",
                    routeTitle: "Новая маршрутная ветка",
                    target: "Укажите решение для бригады СМП.",
                    transport: "Укажите порядок транспортировки.",
                    callouts: ["Укажите обязательное действие."],
                    sources: ["Укажите официальный нормативный источник."],
                  }}
                  onChange={(next) => {
                    setWorking({
                      ...working,
                      document: syncBranchDescriptors(working.document, next, editableRuleSet),
                    });
                    setEditableRuleSet(next);
                    setRuleJson(JSON.stringify(next, null, 2));
                  }}
                />
              ) : (
                <FacilityRuleBuilder
                  profileId="obgyn"
                  title="Акушерство / гинекология"
                  ruleSet={editableRuleSet}
                  questions={working.document.questions}
                  facilityCatalogId="lpu"
                  includeFacilityId
                  tables={[
                    { catalogId: "nearestTargets", label: "Ближайший стационар по территории", key: { $field: "territoryKey" } },
                    { catalogId: "traumaIcuTargets", label: "ДТП / травма с ОАРИТ по территории", key: { $field: "territoryKey" } },
                    { catalogId: "gynTargets", label: "Гинекологический маршрут по территории", key: { $field: "territoryKey" } },
                    { catalogId: "infectionMildTargets", label: "Нетяжёлая инфекция по территории", key: { $field: "territoryKey" } },
                    { catalogId: "surgeryTargets", label: "Хирургический маршрут по территории", key: { $field: "territoryKey" } },
                    { catalogId: "obstetricsLowRiskTargets", label: "Роды низкого риска по территории", key: { $field: "territoryKey" } },
                    { catalogId: "postpartumOtherTargets", label: "Прочие послеродовые осложнения по территории", key: { $field: "territoryKey" } },
                  ]}
                  secondaryTargetField="alternative"
                  textFields={[
                    { field: "title", label: "Название результата" },
                    { field: "transport", label: "Порядок транспортировки", rows: 3 },
                  ]}
                  listFields={[
                    { field: "callouts", label: "Обоснование и действия" },
                    { field: "sources", label: "Нормативные основания" },
                  ]}
                  newRuleResult={{
                    title: "Новая маршрутная ветка",
                    transport: "Укажите порядок транспортировки.",
                    callouts: ["Укажите обязательное действие."],
                    sources: ["Укажите официальный нормативный источник."],
                  }}
                  onChange={(next) => {
                    setWorking({
                      ...working,
                      document: syncBranchDescriptors(working.document, next, editableRuleSet),
                    });
                    setEditableRuleSet(next);
                    setRuleJson(JSON.stringify(next, null, 2));
                  }}
                />
              )}
              <InfectiousControlCaseBuilder
                document={working.document}
                ruleSet={editableRuleSet}
                onChange={(controlCases) =>
                  setWorking({
                    ...working,
                    document: { ...working.document, controlCases },
                  })
                }
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

          {activePublicationBlockers.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="font-semibold">Публикация пока заблокирована</div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
                {activePublicationBlockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveDraft}
              disabled={
                loading ||
                editableDocumentIssues.length > 0 ||
                (supportsVisualEditor(working.profileId) && editableRuleIssues.length > 0)
              }
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {loading ? "Сохранение…" : "Сохранить новую ревизию"}
            </button>
            <button
              type="button"
              onClick={submitForReview}
              disabled={
                loading ||
                activePublicationBlockers.length > 0 ||
                editableDocumentIssues.length > 0 ||
                (supportsVisualEditor(working.profileId) && editableRuleIssues.length > 0)
              }
              className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Сохранить и передать на проверку
            </button>
          </div>
            </>
          ) : null}

          {working.status === "in_review" ? (
            <div className="space-y-3 rounded-xl border border-blue-200 p-4">
              <div className="font-semibold">Утверждение версии</div>
              <p className="text-xs text-neutral-600">
                Укажите приказ, протокол или другое официальное решение, которым
                согласована эта редакция. После публикации она станет рабочей для
                выбранного профиля маршрутизации.
              </p>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Реквизиты решения</span>
                <input
                  value={decisionDocument}
                  onChange={(event) => setDecisionDocument(event.target.value)}
                  placeholder="Например: протокол согласования от ДД.ММ.ГГГГ № …"
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2"
                />
              </label>
              <button
                type="button"
                onClick={approveVersion}
                disabled={
                  loading ||
                  !supportsVisualEditor(working.profileId) ||
                  activePublicationBlockers.length > 0 ||
                  !decisionDocument.trim()
                }
                className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                Утвердить и опубликовать
              </button>
            </div>
          ) : null}

          {working.status === "approved" ? (
            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="font-semibold text-emerald-900">Версия опубликована</div>
              <div className="text-xs text-emerald-900">
                Основание: {working.document.approval?.decisionDocument}
              </div>
              <button
                type="button"
                onClick={archiveVersion}
                disabled={loading}
                className="rounded-xl border border-amber-400 bg-white px-4 py-2 text-sm font-medium text-amber-900 disabled:opacity-40"
              >
                Перенести в архив
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
