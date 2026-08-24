import { useEffect, useState } from "react";
import type { RoutingProfileId } from "../routing";
import { loadPublicDocuments, recordUsageEvent } from "./operations-api";
import type { NormativeDocument } from "./types";

const STATUS_LABELS: Record<NormativeDocument["status"], string> = {
  active: "Действующий",
  needs_confirmation: "Требует подтверждения",
  expired: "Утратил силу",
  replaced: "Заменён",
  archived: "Архив",
};

export default function PublicDocumentsPanel(props: {
  profileId: RoutingProfileId;
  contentVersion: string;
}) {
  const [documents, setDocuments] = useState<NormativeDocument[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    loadPublicDocuments(props.profileId)
      .then((items) => {
        if (active) {
          setFailed(false);
          setDocuments(items);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [props.profileId]);

  if (failed || documents.length === 0) return null;

  function opened(document: NormativeDocument, kind: "official" | "copy") {
    recordUsageEvent({
      profileId: props.profileId,
      contentVersion: props.contentVersion,
      eventType: "document_opened",
      dimension: `${document.code}:${kind}`,
    });
  }

  return (
    <section className="mx-auto mt-4 max-w-6xl rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
      <details>
        <summary className="cursor-pointer font-semibold">
          Нормативные документы профиля ({documents.length})
        </summary>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {documents.map((document) => (
            <article
              key={document.id}
              className="rounded-2xl border border-neutral-200 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="text-xs font-semibold text-neutral-500">
                  {document.code}
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[11px] ${
                    document.status === "active"
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {STATUS_LABELS[document.status]}
                </span>
              </div>
              <h3 className="mt-2 text-sm font-semibold">{document.title}</h3>
              <p className="mt-2 text-xs text-neutral-600">
                № {document.documentNumber}
                {document.issuedOn ? ` от ${document.issuedOn}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                {document.officialUrl ? (
                  <a
                    href={document.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => opened(document, "official")}
                    className="text-blue-700 underline"
                  >
                    Официальный источник
                  </a>
                ) : null}
                {document.fileUrl ? (
                  <a
                    href={document.downloadUrl ?? document.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => opened(document, "copy")}
                    className="text-blue-700 underline"
                  >
                    Открыть копию
                  </a>
                ) : (
                  <span className="text-xs text-neutral-500">
                    Копия ещё не загружена
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      </details>
    </section>
  );
}
