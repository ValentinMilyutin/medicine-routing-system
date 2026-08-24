import type { PublicRoutingContext } from "./types";
import { recordUsageEvent } from "./operations-api";

const EVENT_NAME = "medicine-routing-context";
let currentContext: PublicRoutingContext | null = null;
let lastCompletionKey = "";

export function setPublicRoutingContext(context: PublicRoutingContext) {
  currentContext = context;
  window.dispatchEvent(
    new CustomEvent<PublicRoutingContext>(EVENT_NAME, { detail: context }),
  );
}

export function clearPublicRoutingContext() {
  currentContext = null;
  window.dispatchEvent(
    new CustomEvent<PublicRoutingContext | null>(EVENT_NAME, { detail: null }),
  );
}

export function getPublicRoutingContext(): PublicRoutingContext | null {
  return currentContext;
}

export function subscribePublicRoutingContext(
  listener: (context: PublicRoutingContext | null) => void,
): () => void {
  const handler = (event: Event) => {
    listener((event as CustomEvent<PublicRoutingContext | null>).detail);
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}

export function reportRoutingCompletion(context: PublicRoutingContext) {
  setPublicRoutingContext(context);
  const key = [
    context.profileId,
    context.contentVersion,
    context.ruleId ?? "",
    context.resultId ?? "",
  ].join("|");
  if (key === lastCompletionKey) return;
  lastCompletionKey = key;
  recordUsageEvent({
    profileId: context.profileId,
    contentVersion: context.contentVersion,
    eventType: "route_completed",
    dimension: context.ruleId ?? context.resultId ?? "completed",
  });
}
