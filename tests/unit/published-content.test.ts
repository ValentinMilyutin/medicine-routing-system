import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import publishedContentHandler from "../../api/routing/content";
import {
  approveRoutingContent,
  loadPublishedInfectiousRoutingVersion,
  routingContentDocuments,
  routingRuleSetRegistry,
  type RoutingProfileContentDocument,
} from "../../src/routing";

const ENDPOINT =
  "https://medicine.example/api/routing/content?profileId=infectious";

function approvedInfectiousDocument(): RoutingProfileContentDocument {
  const document = routingContentDocuments.find(
    (item) => item.profileId === "infectious",
  );
  if (!document) throw new Error("Не найден инфекционный профиль.");
  return approveRoutingContent(
    {
      ...document,
      status: "in_review",
      blockingCuratorQuestionIds: [],
      branches: document.branches.map((branch) => ({
        ...branch,
        curatorQuestionIds: [],
      })),
      sources: document.sources.map((source) => ({
        ...source,
        verificationStatus: "verified",
      })),
    },
    {
      approvedAt: "2026-08-20T20:00:00.000Z",
      approvedBy: "admin",
      decisionDocument: "Тестовое решение № 1",
    },
  );
}

beforeEach(() => {
  delete process.env.DATABASE_URL;
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.DATABASE_URL;
});

describe("публичная версия маршрутизации", () => {
  it("не требует административной сессии, но сообщает о неподключённой базе", async () => {
    const response = await publishedContentHandler.fetch(new Request(ENDPOINT));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "database_not_configured" });
  });

  it("отклоняет неподдерживаемые профили до обращения к базе", async () => {
    const response = await publishedContentHandler.fetch(
      new Request("https://medicine.example/api/routing/content?profileId=unknown_profile"),
    );
    expect(response.status).toBe(400);
  });

  it("клиент принимает только утверждённую согласованную версию", async () => {
    const document = approvedInfectiousDocument();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            version: {
              id: "8",
              contentVersion: document.contentVersion,
              updatedAt: document.updatedAt,
              document,
              ruleSet: routingRuleSetRegistry["infectious.v1"],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const version = await loadPublishedInfectiousRoutingVersion();
    expect(version?.document.status).toBe("approved");
    expect(version?.ruleSet.id).toBe("infectious.v1");
  });

  it("клиент не принимает черновик как публичную версию", async () => {
    const document = routingContentDocuments.find(
      (item) => item.profileId === "infectious",
    );
    if (!document) throw new Error("Не найден инфекционный профиль.");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            version: {
              id: "9",
              contentVersion: document.contentVersion,
              updatedAt: document.updatedAt,
              document,
              ruleSet: routingRuleSetRegistry["infectious.v1"],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(loadPublishedInfectiousRoutingVersion()).rejects.toThrow(
      "не прошла проверку профиля",
    );
  });
});
