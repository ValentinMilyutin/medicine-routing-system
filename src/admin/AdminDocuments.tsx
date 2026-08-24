import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  deleteAdminDocumentReference,
  listAdminDocuments,
  saveAdminDocument,
  saveAdminDocumentReference,
} from "../operations/operations-api";
import type { DocumentStatus, NormativeDocument } from "../operations/types";
import {
  routingContentDocuments,
  routingProfileList,
  type RoutingProfileId,
} from "../routing";
import { uploadAdminDocumentFile } from "./admin-document-upload";

type DocumentForm = {
  code: string;
  title: string;
  issuer: string;
  documentNumber: string;
  issuedOn: string;
  status: DocumentStatus;
  officialUrl: string;
  notes: string;
  verified: boolean;
};

const emptyForm: DocumentForm = {
  code: "",
  title: "",
  issuer: "Министерство здравоохранения Новгородской области",
  documentNumber: "",
  issuedOn: "",
  status: "needs_confirmation",
  officialUrl: "",
  notes: "",
  verified: false,
};

const statusLabels: Record<DocumentStatus, string> = {
  active: "Действует",
  needs_confirmation: "Требует подтверждения",
  expired: "Срок действия истёк",
  replaced: "Заменён",
  archived: "Архив",
};

function formFromDocument(document: NormativeDocument): DocumentForm {
  return {
    code: document.code,
    title: document.title,
    issuer: document.issuer,
    documentNumber: document.documentNumber,
    issuedOn: document.issuedOn ?? "",
    status: document.status,
    officialUrl: document.officialUrl ?? "",
    notes: document.notes,
    verified: Boolean(document.verifiedAt),
  };
}

function bytesLabel(value: number | null) {
  if (!value) return "";
  return value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(1)} МБ`
    : `${Math.ceil(value / 1000)} КБ`;
}

export default function AdminDocuments() {
  const [documents, setDocuments] = useState<NormativeDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<DocumentForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [referenceProfile, setReferenceProfile] = useState<RoutingProfileId>("obgyn");
  const [referenceSource, setReferenceSource] = useState("");
  const [referenceBranch, setReferenceBranch] = useState("");
  const [referenceLabel, setReferenceLabel] = useState("");

  const selected = useMemo(
    () => documents.find((document) => document.id === selectedId) ?? null,
    [documents, selectedId],
  );
  const referenceManifest = routingContentDocuments.find(
    (document) => document.profileId === referenceProfile,
  )!;

  async function refresh(preferredId?: string) {
    setLoading(true);
    setError("");
    try {
      const rows = await listAdminDocuments();
      setDocuments(rows);
      const nextId = preferredId ?? selectedId ?? rows[0]?.id ?? null;
      setSelectedId(nextId);
      const next = rows.find((document) => document.id === nextId);
      setForm(next ? formFromDocument(next) : emptyForm);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить документы.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    listAdminDocuments()
      .then((rows) => {
        if (!active) return;
        setDocuments(rows);
        const next = rows[0] ?? null;
        setSelectedId(next?.id ?? null);
        setForm(next ? formFromDocument(next) : emptyForm);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Не удалось загрузить документы.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  function selectDocument(document: NormativeDocument) {
    setSelectedId(document.id);
    setForm(formFromDocument(document));
    setError("");
    setSuccess("");
  }

  function createDocument() {
    setSelectedId(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const saved = await saveAdminDocument({ id: selectedId ?? undefined, ...form });
      await refresh(saved.id);
      setSuccess("Карточка документа сохранена.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить документ.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadFile(file: File | undefined) {
    if (!file || !selected) return;
    setUploading(true);
    setError("");
    setSuccess("");
    try {
      await uploadAdminDocumentFile(selected.id, file);
      await refresh(selected.id);
      setSuccess("Файл загружен и связан с карточкой документа.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить файл.");
    } finally {
      setUploading(false);
    }
  }

  async function addReference(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      await saveAdminDocumentReference({
        documentId: selected.id,
        profileId: referenceProfile,
        sourceId: referenceSource,
        branchId: referenceBranch,
        referenceLabel,
      });
      await refresh(selected.id);
      setReferenceSource("");
      setReferenceBranch("");
      setReferenceLabel("");
      setSuccess("Привязка добавлена.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось добавить привязку.");
    } finally {
      setSaving(false);
    }
  }

  async function removeReference(id: string) {
    if (!selected || !window.confirm("Удалить эту привязку?")) return;
    setSaving(true);
    setError("");
    try {
      await deleteAdminDocumentReference(id);
      await refresh(selected.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось удалить привязку.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.6fr)]">
      <section className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3 px-2">
          <div><h2 className="text-lg font-semibold">Реестр документов</h2><p className="text-xs text-neutral-500">{documents.length} записей</p></div>
          <button type="button" onClick={createDocument} className="rounded-xl bg-neutral-900 px-3 py-2 text-xs font-medium text-white">+ Документ</button>
        </div>
        {loading ? <p className="mt-4 px-2 text-sm text-neutral-500">Загрузка…</p> : (
          <div className="mt-3 space-y-2">
            {documents.map((document) => (
              <button key={document.id} type="button" onClick={() => selectDocument(document)} className={`w-full rounded-2xl border p-3 text-left ${document.id === selectedId ? "border-black bg-neutral-900 text-white" : "border-neutral-200 hover:bg-neutral-50"}`}>
                <div className="font-semibold">{document.documentNumber}</div>
                <div className={`mt-1 line-clamp-2 text-xs ${document.id === selectedId ? "text-neutral-300" : "text-neutral-600"}`}>{document.title}</div>
                <div className={`mt-2 text-xs ${document.id === selectedId ? "text-amber-200" : "text-amber-800"}`}>{statusLabels[document.status]} · {document.references.length} прив.</div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold">{selected ? `Документ ${selected.documentNumber}` : "Новый документ"}</h2>
        <p className="mt-1 text-sm text-neutral-600">Метка нужна для стабильной ссылки из маршрута; название и файл можно менять без изменения метки.</p>
        {error && <div role="alert" className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        {success && <div role="status" className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">{success}</div>}

        <form onSubmit={save} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">Метка документа<input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="NOVGOROD-123-D" className="mt-1 w-full rounded-2xl border border-neutral-300 px-3 py-2" /></label>
          <label className="text-sm">Номер приказа<input required value={form.documentNumber} onChange={(event) => setForm({ ...form, documentNumber: event.target.value })} placeholder="№ 123-Д" className="mt-1 w-full rounded-2xl border border-neutral-300 px-3 py-2" /></label>
          <label className="text-sm sm:col-span-2">Название<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-1 w-full rounded-2xl border border-neutral-300 px-3 py-2" /></label>
          <label className="text-sm sm:col-span-2">Орган, издавший документ<input required value={form.issuer} onChange={(event) => setForm({ ...form, issuer: event.target.value })} className="mt-1 w-full rounded-2xl border border-neutral-300 px-3 py-2" /></label>
          <label className="text-sm">Дата документа<input type="date" value={form.issuedOn} onChange={(event) => setForm({ ...form, issuedOn: event.target.value })} className="mt-1 w-full rounded-2xl border border-neutral-300 px-3 py-2" /></label>
          <label className="text-sm">Статус<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as DocumentStatus })} className="mt-1 w-full rounded-2xl border border-neutral-300 px-3 py-2">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="text-sm sm:col-span-2">Официальная ссылка<input type="url" value={form.officialUrl} onChange={(event) => setForm({ ...form, officialUrl: event.target.value })} placeholder="https://..." className="mt-1 w-full rounded-2xl border border-neutral-300 px-3 py-2" /></label>
          <label className="text-sm sm:col-span-2">Примечание<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} className="mt-1 w-full rounded-2xl border border-neutral-300 px-3 py-2" /></label>
          <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.verified} onChange={(event) => setForm({ ...form, verified: event.target.checked })} className="mt-1" /><span><strong>Метаданные сверены администратором</strong><br /><span className="text-neutral-500">Это не означает автоматическую юридическую проверку актуальности документа.</span></span></label>
          <div className="sm:col-span-2"><button disabled={saving} className="rounded-2xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">{saving ? "Сохранение…" : "Сохранить карточку"}</button></div>
        </form>

        {selected && (
          <>
            <div className="my-6 border-t border-neutral-200" />
            <h3 className="font-semibold">Файл приказа</h3>
            {selected.fileUrl ? (
              <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
                <div className="font-medium">{selected.originalFilename} {bytesLabel(selected.sizeBytes)}</div>
                <div className="mt-1 break-all text-xs text-neutral-600">SHA-256: {selected.sha256}</div>
                <a href={selected.downloadUrl ?? selected.fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-blue-700 underline">Открыть сохранённую копию</a>
              </div>
            ) : <p className="mt-2 text-sm text-neutral-500">Сохранённой копии пока нет. Официальная ссылка может использоваться независимо.</p>}
            <label className="mt-3 inline-flex cursor-pointer rounded-2xl border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50">
              {uploading ? "Загрузка…" : selected.fileUrl ? "Заменить PDF/DOCX" : "Загрузить PDF/DOCX"}
              <input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" disabled={uploading} onChange={(event) => void uploadFile(event.target.files?.[0])} className="sr-only" />
            </label>

            <div className="my-6 border-t border-neutral-200" />
            <h3 className="font-semibold">Привязки к маршрутам</h3>
            <p className="mt-1 text-sm text-neutral-600">Документ появится в публичном профиле. При необходимости уточните конкретную ветку и идентификатор источника.</p>
            <div className="mt-3 space-y-2">
              {selected.references.length === 0 && <p className="text-sm text-neutral-500">Привязок пока нет.</p>}
              {selected.references.map((reference) => (
                <div key={reference.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 p-3 text-sm">
                  <div><div className="font-medium">{routingProfileList.find((profile) => profile.id === reference.profileId)?.title}</div><div className="text-xs text-neutral-500">Источник: {reference.sourceId || "весь профиль"} · ветка: {reference.branchId || "весь профиль"}{reference.referenceLabel ? ` · ${reference.referenceLabel}` : ""}</div></div>
                  <button type="button" disabled={saving} onClick={() => void removeReference(reference.id)} className="rounded-xl border border-red-200 px-3 py-1.5 text-xs text-red-700">Удалить</button>
                </div>
              ))}
            </div>
            <form onSubmit={addReference} className="mt-4 grid gap-3 rounded-2xl bg-neutral-50 p-4 sm:grid-cols-2">
              <label className="text-xs text-neutral-600">Профиль<select value={referenceProfile} onChange={(event) => { setReferenceProfile(event.target.value as RoutingProfileId); setReferenceSource(""); setReferenceBranch(""); }} className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900">{routingProfileList.map((profile) => <option key={profile.id} value={profile.id}>{profile.title}</option>)}</select></label>
              <label className="text-xs text-neutral-600">Источник<select value={referenceSource} onChange={(event) => setReferenceSource(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"><option value="">Весь профиль</option>{referenceManifest.sources.map((source) => <option key={source.id} value={source.id}>{source.id} — {source.label}</option>)}</select></label>
              <label className="text-xs text-neutral-600">Ветка<select value={referenceBranch} onChange={(event) => setReferenceBranch(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"><option value="">Весь профиль</option>{referenceManifest.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.id} — {branch.title}</option>)}</select></label>
              <label className="text-xs text-neutral-600">Пояснение<input value={referenceLabel} onChange={(event) => setReferenceLabel(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900" /></label>
              <div className="sm:col-span-2"><button disabled={saving} className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium">Добавить привязку</button></div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
