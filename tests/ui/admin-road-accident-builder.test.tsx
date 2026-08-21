import React, { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import RoadAccidentRuleBuilder from "../../src/admin/RoadAccidentRuleBuilder";
import { roadAccidentRoutingContent } from "../../src/routing/content-manifests";
import { ROAD_ACCIDENT_RULE_SET_V1 } from "../../src/routing/road-accident-rules-v1";
import type { RoutingRuleSetV1 } from "../../src/routing";

function Harness() {
  const [ruleSet, setRuleSet] = useState(
    structuredClone(ROAD_ACCIDENT_RULE_SET_V1) as RoutingRuleSetV1,
  );
  return (
    <>
      <RoadAccidentRuleBuilder
        ruleSet={ruleSet}
        questions={roadAccidentRoutingContent.questions}
        onChange={setRuleSet}
      />
      <output data-testid="rule-count">{ruleSet.rules.length}</output>
      <output data-testid="facility-count">
        {Object.keys(ruleSet.catalogs.facilities ?? {}).length}
      </output>
    </>
  );
}

describe("визуальный конструктор ДТП", () => {
  it("добавляет медицинскую организацию и новую маршрутную ветку", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByText(/Структура правил и результаты контрольных сочетаний корректны/)).toBeInTheDocument();
    expect(screen.getByTestId("rule-count")).toHaveTextContent("9");
    expect(screen.getByTestId("facility-count")).toHaveTextContent("15");

    await user.click(screen.getByText(/Медицинские организации \(15\)/));
    await user.type(
      screen.getByPlaceholderText("идентификатор новой организации"),
      "reserve_center",
    );
    await user.click(screen.getByRole("button", { name: "Добавить" }));
    expect(screen.getByTestId("facility-count")).toHaveTextContent("16");

    await user.click(screen.getByRole("button", { name: "+ Добавить ветку" }));
    expect(screen.getByTestId("rule-count")).toHaveTextContent("10");
    expect(screen.getByText(/100\. Новая маршрутная ветка/)).toBeInTheDocument();
  });
});
