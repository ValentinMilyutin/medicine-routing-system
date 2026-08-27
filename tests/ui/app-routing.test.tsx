import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import {
  routingContentDocuments,
  routingRuleSetRegistry,
} from "../../src/routing";

describe("пользовательские сценарии приложения", () => {
  beforeEach(() => window.history.replaceState({}, "", "/?routing=1"));
  afterEach(() => vi.unstubAllGlobals());

  it("показывает страницу проекта и открывает маршрутизацию", async () => {
    window.history.replaceState({}, "", "/");
    const user = userEvent.setup();
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: /Маршрут пациента —по клиническим критериям/,
      }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /Начать маршрутизацию/ }),
    );

    expect(
      screen.getByRole("button", { name: /Акушерство \/ гинекология/ }),
    ).toBeInTheDocument();
  });

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
      screen.getByLabelText("Территория вызова"),
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
      screen.getByLabelText("Территория вызова"),
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

  it("проходит ветку ДТП до конкретного травмоцентра и адреса", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ version: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /ДТП \/ травма/ }));
    await user.click(
      screen.getByRole("button", {
        name: "Муниципальная территория или другая дорога",
      }),
    );
    await user.selectOptions(
      screen.getByLabelText("Муниципальная территория"),
      "Батецкий район",
    );
    await user.click(
      screen.getByRole("button", { name: "Взрослый, 18 лет и старше" }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Другая травма без шока и без перечисленных признаков",
      }),
    );

    expect(
      screen.getByText(
        "ГОБУЗ «Центральная городская клиническая больница», Клиника № 1",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Великий Новгород, ул. Зелинского, д. 11")).toBeInTheDocument();
  });

  it("проходит онкологическую ветку медицинской перевозки до учреждения и адреса", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ version: null }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Онкология/ }));
    await user.selectOptions(screen.getByLabelText("Территория вызова"), "Великий Новгород");
    await user.click(screen.getByRole("button", { name: "Установленное злокачественное новообразование" }));
    const transportQuestion = document.querySelector('[data-question-id="medicalTransportNeeded"]');
    if (!transportQuestion) throw new Error("Не найден вопрос о медицинской перевозке.");
    await user.click(within(transportQuestion).getByRole("button", { name: "Да" }));
    expect(screen.getByText(/Медицинская транспортировка без признаков/)).toBeInTheDocument();
    expect(screen.getAllByText(/Центральная городская клиническая больница/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Великий Новгород, ул. Зелинского, д. 11").length).toBeGreaterThan(0);
  });

  it("проходит гинекологическую территориальную ветку до учреждения и адреса", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ version: null }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Акушерство \/ гинекология/ }));
    await user.click(screen.getByRole("button", { name: "Гинекология / беременность менее 37 недель" }));
    await user.selectOptions(screen.getByLabelText("Территория вызова"), "Великий Новгород");
    for (const id of ["critical", "trauma", "surgery", "extragenitalInpatient"]) {
      const element = document.querySelector(`[data-question-id="${id}"]`);
      if (!element) throw new Error(`Не найден вопрос ${id}.`);
      await user.click(within(element).getByRole("button", { name: "Нет" }));
    }
    await user.click(screen.getByRole("button", { name: "Инфекционного синдрома нет" }));
    expect(screen.getAllByText(/Профиль: гинекология/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Центральная городская клиническая больница/)).toBeInTheDocument();
    expect(screen.getByText("Великий Новгород, ул. Зелинского, д. 11")).toBeInTheDocument();
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
      basedOnVersionId: null,
      basedOnContentVersion: baseDocument.contentVersion,
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
        new Response(
          JSON.stringify({
            version: {
              kind: "bundled",
              id: `bundled:${baseDocument.profileId}`,
              profileId: baseDocument.profileId,
              contentVersion: baseDocument.contentVersion,
              document: baseDocument,
              ruleSet,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
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
      await screen.findByText("Активных черновиков пока нет."),
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
      JSON.parse(String(fetchMock.mock.calls[4][1]?.body)),
    ).toMatchObject({
      action: "create_draft",
      profileId: "obgyn",
      contentVersion: "0.4.0-draft.1",
    });
  });
});
