import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import {
  adminRequestOriginAllowed,
  hasAuthenticatedAdminSession,
} from "./session.js";
import {
  attachDocumentFile,
  OperationsDatabaseNotConfiguredError,
  OperationsInputError,
} from "../_lib/operations-store.js";

const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;
const MAXIMUM_SIZE = 25_000_000;

type UploadMetadata = {
  documentId: string;
  originalFilename: string;
  mimeType: (typeof ALLOWED_CONTENT_TYPES)[number];
  sizeBytes: number;
  sha256: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function parseMetadata(value: string | null): UploadMetadata {
  let parsed: unknown;
  try {
    parsed = value ? JSON.parse(value) : null;
  } catch {
    throw new OperationsInputError("Некорректные сведения о файле.");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new OperationsInputError("Не указаны сведения о файле.");
  }
  const input = parsed as Record<string, unknown>;
  if (typeof input.documentId !== "string" || !/^\d+$/.test(input.documentId)) {
    throw new OperationsInputError("Некорректный идентификатор документа.");
  }
  if (
    typeof input.originalFilename !== "string" ||
    input.originalFilename.length < 1 ||
    input.originalFilename.length > 500 ||
    /[\\/\0]/.test(input.originalFilename)
  ) {
    throw new OperationsInputError("Некорректное исходное имя файла.");
  }
  if (
    typeof input.mimeType !== "string" ||
    !ALLOWED_CONTENT_TYPES.includes(
      input.mimeType as (typeof ALLOWED_CONTENT_TYPES)[number],
    )
  ) {
    throw new OperationsInputError("Разрешены только PDF и DOCX.");
  }
  if (
    typeof input.sizeBytes !== "number" ||
    !Number.isInteger(input.sizeBytes) ||
    input.sizeBytes <= 0 ||
    input.sizeBytes > MAXIMUM_SIZE
  ) {
    throw new OperationsInputError("Файл превышает допустимый размер 25 МБ.");
  }
  if (typeof input.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(input.sha256)) {
    throw new OperationsInputError("Некорректная контрольная сумма файла.");
  }
  return input as UploadMetadata;
}

function expectedExtension(metadata: UploadMetadata): string {
  return metadata.mimeType === "application/pdf" ? ".pdf" : ".docx";
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405);
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return json({ error: "blob_not_configured" }, 503);
    }
    try {
      const body = (await request.json()) as HandleUploadBody;
      if (body.type === "blob.generate-client-token") {
        if (!hasAuthenticatedAdminSession(request)) {
          return json({ error: "unauthorized" }, 401);
        }
        if (!adminRequestOriginAllowed(request)) {
          return json({ error: "forbidden_origin" }, 403);
        }
      }
      const result = await handleUpload({
        request,
        body,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          const metadata = parseMetadata(clientPayload);
          const expectedPrefix = `normative/${metadata.documentId}/${metadata.sha256}`;
          if (
            pathname !== `${expectedPrefix}${expectedExtension(metadata)}`
          ) {
            throw new OperationsInputError("Некорректный путь загрузки.");
          }
          return {
            allowedContentTypes: [...ALLOWED_CONTENT_TYPES],
            maximumSizeInBytes: MAXIMUM_SIZE,
            addRandomSuffix: true,
            tokenPayload: JSON.stringify(metadata),
          };
        },
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          const metadata = parseMetadata(tokenPayload ?? null);
          await attachDocumentFile({
            documentId: metadata.documentId,
            pathname: blob.pathname,
            url: blob.url,
            downloadUrl: blob.downloadUrl,
            originalFilename: metadata.originalFilename,
            mimeType: metadata.mimeType,
            sizeBytes: metadata.sizeBytes,
            sha256: metadata.sha256,
          });
        },
      });
      return json(result);
    } catch (reason) {
      if (reason instanceof OperationsDatabaseNotConfiguredError) {
        return json({ error: "database_not_configured" }, 503);
      }
      if (reason instanceof OperationsInputError || reason instanceof SyntaxError) {
        return json(
          {
            error: "invalid_request",
            message: reason instanceof Error ? reason.message : undefined,
          },
          400,
        );
      }
      if (typeof reason === "object" && reason !== null && "code" in reason) {
        if (reason.code === "42P01") {
          return json({ error: "database_not_initialized" }, 503);
        }
      }
      console.error("Document upload failed", reason);
      return json({ error: "upload_failed" }, 500);
    }
  },
};
