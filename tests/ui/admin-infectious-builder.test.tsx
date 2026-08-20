import React, { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import InfectiousRuleBuilder from "../../src/admin/InfectiousRuleBuilder";
import { INFECTIOUS_RULE_SET_V1 } from "../../src/routing/infectious-rules-v1";
import type { RoutingRuleSetV1 } from "../../src/routing";

function initialRuleSet(): RoutingRuleSetV1 {
  return structuredClone(INFECTIOUS_RULE_SET_V1) as RoutingRuleSetV1;
}

function Harness() {
  const [ruleSet, setRuleSet] = useState(initialRuleSet);
  return <InfectiousRuleBuilder ruleSet={ruleSet} onChange={setRuleSet} />;
}

describe("визуальный конструктор инфекционных веток", () => {
  it("показывает корректный предпросмотр и добавляет валидную ветку", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByText("Структура правил корректна. Сервер повторно проверит её при сохранении.")).toBeInTheDocument();
    expect(screen.getByText(/Сработала ветка: outpatient_general/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "+ Добавить ветку" }));

    expect(screen.getByText("Исполняемые маршрутные правила (11)")).toBeInTheDocument();
    expect(screen.getByText(/110\. Новая маршрутная ветка/)).toBeInTheDocument();
    expect(screen.queryByText(/Нужно исправить перед сохранением/)).not.toBeInTheDocument();
  });

  it("изменяет результат ветки и сразу показывает его в предпросмотре", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const summaryTitle = screen.getByText(/30\. Стационарная маршрутизация не требуется/);
    expect(summaryTitle).toBeDefined();
    await user.click(summaryTitle!);

    const branch = summaryTitle!.closest("details");
    expect(branch).not.toBeNull();
    const titleInput = within(branch!).getByLabelText("Название результата");
    fireEvent.change(titleInput, {
      target: { value: "Амбулаторный маршрут без госпитализации" },
    });

    expect(
      screen.getAllByText("Амбулаторный маршрут без госпитализации").length,
    ).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Сработала ветка: outpatient_general/)).toBeInTheDocument();
  });

  it("обновляет адрес медицинской организации в территориальном результате", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByText(/Медицинские организации \(8\)/));
    const noibId = screen.getByText("noib");
    const noibCard = noibId.closest("div.rounded-xl");
    expect(noibCard).not.toBeNull();
    const address = within(noibCard!).getByLabelText("Город и адрес");
    fireEvent.change(address, {
      target: { value: "Великий Новгород, тестовый адрес черновика" },
    });

    await user.click(
      screen.getByRole("checkbox", {
        name: "Среднетяжёлое течение, требующее стационарного лечения",
      }),
    );

    expect(
      screen.getAllByText("Великий Новгород, тестовый адрес черновика").length,
    ).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Сработала ветка: territorial_direct/)).toBeInTheDocument();
  });
});
