import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import {
  routingContentDocuments,
  routingRuleSetRegistry,
} from "../../src/routing";

describe("пользовательские сценарии приложения", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("показывает все шесть профилей", () => {
    render(<App />);

    for (const name of [
      /Акушерство \/ гинекология/,
      /Онкология/,
      /БСК \/ ССЗ/,
      /Дерматовенерология/,
      /Инфекционные болезни/,
      /ДТП \/ травма/,
    ]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("проходит экстренную дерматовенерологическую ветку от профиля до результата", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: /Дерматовенерология/ }),
    );
    await user.selectOptions(
      screen.getByLabelText("Муниципальный район или округ"),
      "Боровичский район",
    );
    await user.click(screen.getByRole("button", { name: "Отёк Квинке" }));

    expect(
      screen.getByText("Отёк Квинке: экстренная госпитализация"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Ближайшая медицинская организация с ОАРИТ/),
    ).toBeInTheDocument();
    expect(screen.getByText("Нормативные источники")).toBeInTheDocument();
  });

  it("проходит территориальную инфекционную ветку до конкретного стационара", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: /Инфекционные болезни/ }),
    );
    await user.selectOptions(
      screen.getByLabelText("Муниципальный район или округ"),
      "Старорусский район",
    );
    await user.click(
      screen.getByRole("button", {
        name: "Другое или пока неуточнённое инфекционное заболевание",
      }),
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: "Перечисленных жизнеугрожающих состояний нет",
      }),
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: "Среднетяжёлое течение, требующее стационарного лечения",
      }),
    );

    expect(
      screen.getByText(
        "Показана госпитализация в территориальный инфекционный стационар",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("ГОБУЗ «Старорусская центральная районная больница»"),
    ).toBeInTheDocument();
  });

  it("возвращается из профиля к общему выбору", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /БСК \/ ССЗ/ }));
    await user.click(screen.getByRole("button", { name: /К выбору профиля/ }));

    expect(
      screen.getByRole("button", { name: /ДТП \/ травма/ }),
    ).toBeInTheDocument();
  });

  it("оставляет публичные маршруты доступными без авторизации", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: /Онкология/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Администрирование/ })).toBeEnabled();
  });

  it("открывает admin-вход и после пароля показывает единый контур управления", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ authenticated: false }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            authenticated: true,
            user: { username: "admin", role: "admin" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ authenticated: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Администрирование/ }));
    expect(
      await screen.findByRole("heading", { name: "Вход администратора" }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Пароль"), "secret-password");
    await user.click(screen.getByRole("button", { name: "Войти как admin" }));

    expect(
      await screen.findByRole("heading", { name: "Контур администрации" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Активная учётная запись: admin")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ДТП \/ травма/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Выйти" }));
    expect(
      await screen.findByRole("heading", { name: "Вход администратора" }),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([, init]) => init?.method)).toEqual([
      "GET",
      "POST",
      "DELETE",
    ]);
  });

  it("создаёт отдельный административный черновик в постоянном хранилище", async () => {
    const baseDocument = routingContentDocuments[0];
    if (baseDocument.execution.kind !== "rules_v1") {
      throw new Error("Тестовый профиль должен использовать rules_v1.");
    }
    const ruleSet = routingRuleSetRegistry[
      baseDocument.execution.ruleSetId as keyof typeof routingRuleSetRegistry
    ];
    const storedVersion = {
      id: "1",
      profileId: baseDocument.profileId,
      contentVersion: "0.4.0-draft.1",
      status: "draft",
      revision: 1,
      questionCount: baseDocument.questions.length,
      branchCount: baseDocument.branches.length,
      sourceCount: baseDocument.sources.length,
      createdAt: "2026-08-20T18:00:00.000Z",
      updatedAt: "2026-08-20T18:00:00.000Z",
      document: {
        ...baseDocument,
        contentVersion: "0.4.0-draft.1",
        changeSummary: "Уточнение тестовой ветки",
      },
      ruleSet,
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ authenticated: false }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            authenticated: true,
            user: { username: "admin", role: "admin" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ versions: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ version: storedVersion }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Администрирование/ }));
    await screen.findByRole("heading", { name: "Вход администратора" });
    await user.type(screen.getByLabelText("Пароль"), "secret-password");
    await user.click(screen.getByRole("button", { name: "Войти как admin" }));
    await screen.findByRole("heading", { name: "Контур администрации" });

    await user.click(
      screen.getByRole("button", { name: "Открыть версии и черновики" }),
    );
    expect(
      await screen.findByText("В базе пока нет версий этого профиля."),
    ).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Новая версия"));
    await user.type(screen.getByLabelText("Новая версия"), "0.4.0-draft.1");
    await user.type(
      screen.getByLabelText("Что планируется изменить"),
      "Уточнение тестовой ветки",
    );
    await user.click(screen.getByRole("button", { name: "Создать черновик" }));

    expect(await screen.findByText(/Редактор черновика/)).toBeInTheDocument();
    expect(screen.getAllByText(/ревизия 1/)).toHaveLength(2);
    expect(
      JSON.parse(String(fetchMock.mock.calls[3][1]?.body)),
    ).toMatchObject({
      action: "create_draft",
      profileId: "obgyn",
      contentVersion: "0.4.0-draft.1",
    });
  });
});
