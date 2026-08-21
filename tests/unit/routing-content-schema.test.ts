import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cwd } from "node:process";
import { describe, expect, it } from "vitest";
import {
  approveRoutingContent,
  createRoutingContentDraft,
  parseRoutingContentDocument,
  publicationBlockers,
  routingContentDocuments,
  routingProfileRegistry,
  submitRoutingContentForReview,
  validateRoutingContentDocument,
  type RoutingProfileContentDocument,
} from "../../src/routing";

function mutableCopy(
  document: RoutingProfileContentDocument,
): Record<string, unknown> {
  return JSON.parse(JSON.stringify(document)) as Record<string, unknown>;
}

describe("версионируемые документы маршрутизации", () => {
  it("описывают все шесть профилей и проходят проверку схемы", () => {
    expect(routingContentDocuments).toHaveLength(6);

    routingContentDocuments.forEach((document) => {
      expect(validateRoutingContentDocument(document)).toEqual([]);
      expect(routingProfileRegistry[document.profileId].content).toBe(document);
    });
  });

  it("фиксируют все текущие конечные категории", () => {
    const branchCount = routingContentDocuments.reduce(
      (total, document) => total + document.branches.length,
      0,
    );

    expect(branchCount).toBe(44);
  });

  it("сериализуются в JSON и восстанавливаются без функций", () => {
    const document = routingContentDocuments[3];
    const restored = parseRoutingContentDocument(JSON.stringify(document));

    expect(restored).toEqual(document);
    expect(restored.execution.kind).toBe("rules_v1");
  });

  it("не позволяет опубликовать текущие черновики", () => {
    routingContentDocuments.forEach((document) => {
      expect(document.status).toBe("draft");
      expect(publicationBlockers(document).length).toBeGreaterThan(0);
    });
  });

  it("использует только зарегистрированные вопросы кураторов", () => {
    const registry = JSON.parse(
      readFileSync(
        resolve(cwd(), "docs/testing/minzdrav-review-questions.json"),
        "utf8",
      ),
    ) as Array<{ id: string }>;
    const knownIds = new Set(registry.map((question) => question.id));

    routingContentDocuments.forEach((document) => {
      document.blockingCuratorQuestionIds.forEach((questionId) => {
        expect(knownIds.has(questionId), questionId).toBe(true);
      });
    });
  });

  it("создаёт следующую редакцию как отдельный черновик", () => {
    const document = routingContentDocuments[0];
    const draft = createRoutingContentDraft(document, {
      contentVersion: "0.3.0-draft.2",
      updatedAt: "2026-08-20T20:00:00+03:00",
      changeSummary: "Тестовая следующая редакция.",
    });

    expect(draft).not.toBe(document);
    expect(draft.contentVersion).toBe("0.3.0-draft.2");
    expect(draft.status).toBe("draft");
    expect(document.contentVersion).toBe("0.3.0-draft.1");
  });

  it("поддерживает переход черновик → проверка, но блокирует преждевременное утверждение", () => {
    const review = submitRoutingContentForReview(
      routingContentDocuments[3],
      "2026-08-20T20:00:00+03:00",
    );

    expect(review.status).toBe("in_review");
    expect(() =>
      approveRoutingContent(review, {
        approvedAt: "2026-08-20T21:00:00+03:00",
        approvedBy: "Куратор",
        decisionDocument: "Решение тестовой комиссии",
      }),
    ).toThrow("Некорректный документ маршрутизации");
  });

  it("разрешает утверждение только после закрытия вопросов и проверки источников", () => {
    const document = routingContentDocuments[3];
    const review: RoutingProfileContentDocument = {
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
    };

    const approved = approveRoutingContent(review, {
      approvedAt: "2026-08-20T21:00:00+03:00",
      approvedBy: "Куратор",
      decisionDocument: "Решение тестовой комиссии",
    });

    expect(approved.status).toBe("approved");
    expect(approved.approval?.approvedBy).toBe("Куратор");
    expect(validateRoutingContentDocument(approved)).toEqual([]);
  });

  it("отклоняет неизвестную версию схемы и некорректный SemVer", () => {
    const document = mutableCopy(routingContentDocuments[0]);
    document.schemaVersion = 2;
    document.contentVersion = "черновик";

    const paths = validateRoutingContentDocument(document).map(
      (issue) => issue.path,
    );
    expect(paths).toContain("schemaVersion");
    expect(paths).toContain("contentVersion");
  });

  it("отклоняет повторяющиеся ветки и ссылки на неизвестный источник", () => {
    const document = mutableCopy(routingContentDocuments[3]);
    const branches = document.branches as Array<Record<string, unknown>>;
    branches.push({
      ...branches[0],
      priority: 99,
      sourceIds: ["unknown-source"],
    });

    const messages = validateRoutingContentDocument(document).map(
      (issue) => issue.message,
    );
    expect(messages.some((message) => message.includes("Повторяется идентификатор"))).toBe(true);
    expect(messages.some((message) => message.includes("Неизвестный источник"))).toBe(true);
  });

  it("отклоняет утверждение с открытыми вопросами и непроверенными источниками", () => {
    const document = mutableCopy(routingContentDocuments[4]);
    document.status = "approved";

    const messages = validateRoutingContentDocument(document).map(
      (issue) => issue.message,
    );
    expect(messages).toContain(
      "Нельзя утвердить версию с открытыми блокирующими вопросами.",
    );
    expect(messages).toContain(
      "Для утверждённой версии нужны реквизиты согласования.",
    );
    expect(
      messages.some((message) =>
        message.includes("не может ссылаться на непроверенный источник"),
      ),
    ).toBe(true);
  });

  it("не разрешает переход к предыдущему вопросу через ещё недоступное поле", () => {
    const document = mutableCopy(routingContentDocuments[4]);
    const questions = document.questions as Array<Record<string, unknown>>;
    questions[1]!.visibility = {
      op: "eq",
      field: "transportable",
      value: true,
    };

    expect(validateRoutingContentDocument(document)).toContainEqual(
      expect.objectContaining({
        path: "questions[1].visibility",
        message: expect.stringContaining("недоступный или следующий вопрос"),
      }),
    );
  });

  it("проверяет соответствие оператора типу ответа", () => {
    const document = mutableCopy(routingContentDocuments[4]);
    const questions = document.questions as Array<Record<string, unknown>>;
    questions[3]!.visibility = {
      op: "eq",
      field: "lifeThreats",
      value: "none",
    };

    expect(validateRoutingContentDocument(document)).toContainEqual(
      expect.objectContaining({
        path: "questions[3].visibility",
        message: expect.stringContaining("множественного вопроса"),
      }),
    );
  });
});
