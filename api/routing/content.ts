import {
  DatabaseNotConfiguredError,
  getPublishedRoutingVersion,
  RoutingContentInputError,
} from "../_lib/routing-content-store.js";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "GET") {
      return new Response(null, {
        status: 405,
        headers: { Allow: "GET" },
      });
    }
    const profileId = new URL(request.url).searchParams.get("profileId");
    if (profileId !== "infectious") {
      return json({ error: "unsupported_profile" }, 400);
    }
    try {
      return json({ version: await getPublishedRoutingVersion(profileId) });
    } catch (reason) {
      if (reason instanceof DatabaseNotConfiguredError) {
        return json({ error: "database_not_configured" }, 503);
      }
      if (reason instanceof RoutingContentInputError) {
        return json({ error: "invalid_request", message: reason.message }, 400);
      }
      if (typeof reason === "object" && reason !== null && "code" in reason) {
        if (reason.code === "42P01") {
          return json({ error: "database_not_initialized" }, 503);
        }
      }
      console.error("Published routing content request failed", reason);
      return json({ error: "internal_error" }, 500);
    }
  },
};
