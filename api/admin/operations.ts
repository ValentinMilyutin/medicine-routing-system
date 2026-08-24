import {
  adminRequestOriginAllowed,
  hasAuthenticatedAdminSession,
} from "./session.js";
import {
  deleteDocumentReference,
  deleteFeedbackRecipient,
  listFeedbackRecipients,
  listNormativeDocuments,
  listRoutingFeedback,
  listUsageStats,
  OperationsDatabaseNotConfiguredError,
  OperationsInputError,
  saveDocumentReference,
  saveFeedbackRecipient,
  saveNormativeDocument,
  updateRoutingFeedback,
} from "../_lib/operations-store.js";

class InvalidRequestError extends Error {}

function json(body: unknown, status = 200, extraHeaders?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}

async function requestBody(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json();
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new InvalidRequestError("Тело запроса должно быть объектом.");
  }
  return body as Record<string, unknown>;
}

function errorResponse(reason: unknown): Response {
  if (reason instanceof OperationsDatabaseNotConfiguredError) {
    return json({ error: "database_not_configured" }, 503);
  }
  if (
    reason instanceof OperationsInputError ||
    reason instanceof InvalidRequestError ||
    reason instanceof SyntaxError
  ) {
    return json({ error: "invalid_request", message: reason.message }, 400);
  }
  if (typeof reason === "object" && reason !== null && "code" in reason) {
    if (reason.code === "42P01") {
      return json({ error: "database_not_initialized" }, 503);
    }
    if (reason.code === "23505") {
      return json(
        { error: "conflict", message: "Такая запись уже существует." },
        409,
      );
    }
  }
  console.error("Admin operations request failed", reason);
  return json({ error: "internal_error" }, 500);
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (!hasAuthenticatedAdminSession(request)) {
      return json({ error: "unauthorized" }, 401);
    }
    try {
      if (request.method === "GET") {
        const params = new URL(request.url).searchParams;
        const section = params.get("section");
        if (section === "feedback") {
          return json({ feedback: await listRoutingFeedback() });
        }
        if (section === "recipients") {
          return json({ recipients: await listFeedbackRecipients() });
        }
        if (section === "documents") {
          return json({
            documents: await listNormativeDocuments({ includeArchived: true }),
          });
        }
        if (section === "stats") {
          return json({ stats: await listUsageStats(params.get("days")) });
        }
        throw new InvalidRequestError("Неизвестный административный раздел.");
      }

      if (request.method === "POST") {
        if (!adminRequestOriginAllowed(request)) {
          return json({ error: "forbidden_origin" }, 403);
        }
        const body = await requestBody(request);
        if (body.action === "save_recipient") {
          return json({
            recipient: await saveFeedbackRecipient({
              id: body.id,
              email: body.email,
              label: body.label,
              enabled: body.enabled,
            }),
          });
        }
        if (body.action === "delete_recipient") {
          await deleteFeedbackRecipient(body.id);
          return json({ deleted: true });
        }
        if (body.action === "update_feedback") {
          return json({
            feedback: await updateRoutingFeedback({
              id: body.id,
              status: body.status,
              adminNote: body.adminNote,
            }),
          });
        }
        if (body.action === "save_document") {
          return json({
            document: await saveNormativeDocument({
              id: body.id,
              code: body.code,
              title: body.title,
              issuer: body.issuer,
              documentNumber: body.documentNumber,
              issuedOn: body.issuedOn,
              status: body.status,
              officialUrl: body.officialUrl,
              notes: body.notes,
              verified: body.verified,
            }),
          });
        }
        if (body.action === "save_document_reference") {
          await saveDocumentReference({
            id: body.id,
            documentId: body.documentId,
            profileId: body.profileId,
            sourceId: body.sourceId,
            branchId: body.branchId,
            referenceLabel: body.referenceLabel,
          });
          return json({ saved: true });
        }
        if (body.action === "delete_document_reference") {
          await deleteDocumentReference(body.id);
          return json({ deleted: true });
        }
        throw new InvalidRequestError("Неизвестное административное действие.");
      }

      return json(
        { error: "method_not_allowed" },
        405,
        { Allow: "GET, POST" },
      );
    } catch (reason) {
      return errorResponse(reason);
    }
  },
};
