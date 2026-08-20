import { afterEach, beforeEach, describe, expect, it } from "vitest";
import adminContentHandler from "../../api/admin/content";
import { routingContentStoreTestUtils } from "../../api/_lib/routing-content-store";
import {
  routingContentDocuments,
  routingRuleSetRegistry,
} from "../../src/routing";
import { adminSessionTestUtils } from "../../api/admin/session";

const ENDPOINT = "https://medicine.example/api/admin/content";
const SESSION_SECRET = "test-session-secret-with-at-least-32-characters";

function authenticatedRequest(method = "GET", origin = "https://medicine.example") {
  const token = adminSessionTestUtils.createSessionToken(SESSION_SECRET);
  return new Request(ENDPOINT, {
    method,
    headers: {
      cookie: `${adminSessionTestUtils.cookieName}=${token}`,
      origin,
    },
  });
}

beforeEach(() => {
  process.env.ADMIN_PASSWORD = "test-password";
  process.env.ADMIN_SESSION_SECRET = SESSION_SECRET;
  delete process.env.DATABASE_URL;
});

afterEach(() => {
  delete process.env.ADMIN_PASSWORD;
  delete process.env.ADMIN_SESSION_SECRET;
  delete process.env.DATABASE_URL;
});

describe("серверное хранилище административных версий", () => {
  it("не раскрывает версии без административной сессии", async () => {
    const response = await adminContentHandler.fetch(new Request(ENDPOINT));
    expect(response.status).toBe(401);
  });

  it("отдельно сообщает о неподключённой базе после успешной авторизации", async () => {
    const response = await adminContentHandler.fetch(authenticatedRequest());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "database_not_configured" });
  });

  it("отклоняет изменяющий запрос с чужого origin до обращения к базе", async () => {
    const response = await adminContentHandler.fetch(
      authenticatedRequest("POST", "https://attacker.example"),
    );
    expect(response.status).toBe(403);
  });

  it("принимает только согласованную пару документа и rules_v1", () => {
    const document = routingContentDocuments[0];
    if (document.execution.kind !== "rules_v1") {
      throw new Error("Тестовый профиль должен использовать rules_v1.");
    }
    const ruleSet = routingRuleSetRegistry[
      document.execution.ruleSetId as keyof typeof routingRuleSetRegistry
    ];
    expect(() =>
      routingContentStoreTestUtils.parseBundle(document, ruleSet),
    ).not.toThrow();

    const mismatchedRuleSet = routingRuleSetRegistry["bsk.v1"];
    expect(() =>
      routingContentStoreTestUtils.parseBundle(document, mismatchedRuleSet),
    ).toThrow(/разным профилям/);
  });

  it("преобразует служебную строку базы в безопасную сводку", () => {
    const summary = routingContentStoreTestUtils.summaryFromRow({
      id: "17",
      profile_id: "infectious",
      content_version: "0.4.0-draft.1",
      status: "draft",
      revision: 3,
      question_count: 8,
      branch_count: 10,
      source_count: 2,
      created_at: "2026-08-20T18:00:00.000Z",
      updated_at: "2026-08-20T19:00:00.000Z",
    });
    expect(summary).toMatchObject({
      id: "17",
      profileId: "infectious",
      revision: 3,
      branchCount: 10,
    });
  });
});
