import { sendFeedbackNotification } from "./_lib/feedback-email.js";
import {
  createRoutingFeedback,
  incrementUsageEvent,
  listFeedbackRecipients,
  OperationsDatabaseNotConfiguredError,
  OperationsInputError,
  setFeedbackNotification,
} from "./_lib/operations-store.js";

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

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405);
    }
    if (!sameOrigin(request)) return json({ error: "forbidden_origin" }, 403);
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > 12_000) return json({ error: "payload_too_large" }, 413);
    try {
      const body = (await request.json()) as Record<string, unknown>;
      if (typeof body !== "object" || body === null || Array.isArray(body)) {
        throw new OperationsInputError("Тело запроса должно быть объектом.");
      }
      if (typeof body.website === "string" && body.website.length > 0) {
        return json({ accepted: true }, 202);
      }
      const feedback = await createRoutingFeedback({
        category: body.category,
        message: body.message,
        profileId: body.profileId,
        contentVersion: body.contentVersion,
        resultId: body.resultId,
        ruleId: body.ruleId,
      });
      try {
        const notification = await sendFeedbackNotification({
          feedback,
          recipients: await listFeedbackRecipients(true),
          requestOrigin: new URL(request.url).origin,
        });
        await setFeedbackNotification({
          id: feedback.id,
          status: notification.status,
          error: notification.error,
        });
      } catch (notificationError) {
        console.error("Feedback was saved, but notification failed", notificationError);
        try {
          await setFeedbackNotification({
            id: feedback.id,
            status: "failed",
            error:
              notificationError instanceof Error
                ? notificationError.message
                : "Unknown notification error",
          });
        } catch (statusError) {
          console.error("Unable to record notification failure", statusError);
        }
      }
      if (feedback.profileId) {
        try {
          await incrementUsageEvent({
            profileId: feedback.profileId,
            contentVersion: feedback.contentVersion,
            eventType: "feedback_submitted",
            dimension: feedback.category,
          });
        } catch (analyticsError) {
          console.error("Feedback was saved, but analytics failed", analyticsError);
        }
      }
      return json({ accepted: true, id: feedback.id }, 201);
    } catch (reason) {
      if (reason instanceof OperationsDatabaseNotConfiguredError) {
        return json({ error: "database_not_configured" }, 503);
      }
      if (reason instanceof SyntaxError || reason instanceof OperationsInputError) {
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
      console.error("Public feedback request failed", reason);
      return json({ error: "internal_error" }, 500);
    }
  },
};
