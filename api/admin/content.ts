import {
  adminRequestOriginAllowed,
  hasAuthenticatedAdminSession,
} from "./session.js";
import {
  createStoredRoutingDraft,
  DatabaseNotConfiguredError,
  getStoredRoutingVersion,
  listStoredRoutingVersions,
  RoutingContentInputError,
  RoutingVersionConflictError,
  saveStoredRoutingDraft,
} from "../_lib/routing-content-store.js";

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
  if (reason instanceof DatabaseNotConfiguredError) {
    return json({ error: "database_not_configured" }, 503);
  }
  if (reason instanceof RoutingVersionConflictError) {
    return json({ error: "version_conflict", message: reason.message }, 409);
  }
  if (
    reason instanceof SyntaxError ||
    reason instanceof InvalidRequestError ||
    reason instanceof RoutingContentInputError
  ) {
    return json({ error: "invalid_request", message: reason.message }, 400);
  }
  if (typeof reason === "object" && reason !== null && "code" in reason) {
    if (reason.code === "42P01") {
      return json({ error: "database_not_initialized" }, 503);
    }
    if (reason.code === "23505") {
      return json({ error: "version_conflict" }, 409);
    }
  }
  console.error("Admin content request failed", reason);
  return json({ error: "internal_error" }, 500);
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (!hasAuthenticatedAdminSession(request)) {
      return json({ error: "unauthorized" }, 401);
    }

    try {
      if (request.method === "GET") {
        const id = new URL(request.url).searchParams.get("id");
        if (id) {
          const version = await getStoredRoutingVersion(id);
          return version
            ? json({ version })
            : json({ error: "not_found" }, 404);
        }
        return json({ versions: await listStoredRoutingVersions() });
      }

      if (request.method === "POST") {
        if (!adminRequestOriginAllowed(request)) {
          return json({ error: "forbidden_origin" }, 403);
        }
        const body = await requestBody(request);
        if (body.action === "create_draft") {
          if (
            typeof body.contentVersion !== "string" ||
            typeof body.changeSummary !== "string"
          ) {
            throw new InvalidRequestError(
              "Не указаны версия и описание изменений.",
            );
          }
          const version = await createStoredRoutingDraft({
            profileId: body.profileId,
            contentVersion: body.contentVersion,
            changeSummary: body.changeSummary,
          });
          return json({ version }, 201);
        }
        if (body.action === "save_draft") {
          if (
            typeof body.id !== "string" ||
            typeof body.expectedRevision !== "number"
          ) {
            throw new InvalidRequestError(
              "Не указаны идентификатор и ревизия черновика.",
            );
          }
          const version = await saveStoredRoutingDraft({
            id: body.id,
            expectedRevision: body.expectedRevision,
            document: body.document,
            ruleSet: body.ruleSet,
          });
          return json({ version });
        }
        throw new InvalidRequestError("Неизвестное действие.");
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
