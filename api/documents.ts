import {
  listNormativeDocuments,
  OperationsDatabaseNotConfiguredError,
  OperationsInputError,
  OPERATIONS_PROFILE_IDS,
  type OperationsProfileId,
} from "./_lib/operations-store.js";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405);
    const requestedProfile = new URL(request.url).searchParams.get("profileId");
    const profileId = requestedProfile as OperationsProfileId | null;
    if (
      profileId &&
      !OPERATIONS_PROFILE_IDS.includes(profileId)
    ) {
      return json({ error: "unsupported_profile" }, 400);
    }
    try {
      const documents = await listNormativeDocuments({ profileId });
      return json({ documents });
    } catch (reason) {
      if (reason instanceof OperationsDatabaseNotConfiguredError) {
        return json({ error: "database_not_configured" }, 503);
      }
      if (reason instanceof OperationsInputError) {
        return json({ error: "invalid_request", message: reason.message }, 400);
      }
      if (typeof reason === "object" && reason !== null && "code" in reason) {
        if (reason.code === "42P01") {
          return json({ error: "database_not_initialized" }, 503);
        }
      }
      console.error("Public documents request failed", reason);
      return json({ error: "internal_error" }, 500);
    }
  },
};
