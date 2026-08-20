import {
  assertRoutingContentDocument,
  type RoutingProfileContentDocument,
} from "./content-schema.js";
import {
  assertRoutingRuleSetV1,
  type RoutingRuleSetV1,
} from "./rules-v1.js";

export type PublishedRoutingVersion = {
  id: string;
  contentVersion: string;
  updatedAt: string;
  document: RoutingProfileContentDocument;
  ruleSet: RoutingRuleSetV1;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePublishedVersion(value: unknown): PublishedRoutingVersion | null {
  if (value === null) return null;
  if (!isRecord(value)) {
    throw new Error("Сервер вернул некорректную опубликованную версию.");
  }
  assertRoutingContentDocument(value.document);
  assertRoutingRuleSetV1(value.ruleSet);
  if (
    value.document.status !== "approved" ||
    value.document.profileId !== "infectious" ||
    value.ruleSet.profileId !== "infectious" ||
    value.document.execution.kind !== "rules_v1" ||
    value.document.execution.ruleSetId !== value.ruleSet.id
  ) {
    throw new Error("Опубликованная версия не прошла проверку профиля.");
  }
  if (
    typeof value.id !== "string" ||
    typeof value.contentVersion !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    throw new Error("Опубликованная версия не содержит служебных реквизитов.");
  }
  return value as PublishedRoutingVersion;
}

export async function loadPublishedInfectiousRoutingVersion(
  signal?: AbortSignal,
): Promise<PublishedRoutingVersion | null> {
  const response = await fetch("/api/routing/content?profileId=infectious", {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error("Не удалось загрузить опубликованную версию.");
  }
  const body: unknown = await response.json();
  if (!isRecord(body) || !("version" in body)) {
    throw new Error("Сервер вернул некорректный ответ.");
  }
  return parsePublishedVersion(body.version);
}
