import {
  incrementUsageEvent,
  OperationsDatabaseNotConfiguredError,
  OperationsInputError,
} from "../_lib/operations-store.js";

function response(status = 204, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers:
      body === undefined
        ? undefined
        : { "Content-Type": "application/json; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") return response(405);
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return response(403);
    try {
      const body = (await request.json()) as Record<string, unknown>;
      if (typeof body !== "object" || body === null || Array.isArray(body)) {
        throw new OperationsInputError("Некорректное событие.");
      }
      await incrementUsageEvent({
        profileId: body.profileId,
        contentVersion: body.contentVersion,
        eventType: body.eventType,
        dimension: body.dimension,
      });
      return response();
    } catch (reason) {
      if (reason instanceof OperationsInputError || reason instanceof SyntaxError) {
        return response(400, { error: "invalid_request" });
      }
      if (reason instanceof OperationsDatabaseNotConfiguredError) {
        return response(503, { error: "database_not_configured" });
      }
      if (typeof reason === "object" && reason !== null && "code" in reason) {
        if (reason.code === "42P01") {
          return response(503, { error: "database_not_initialized" });
        }
      }
      console.error("Usage event failed", reason);
      return response(500, { error: "internal_error" });
    }
  },
};
