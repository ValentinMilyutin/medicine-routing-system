import React, { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import InfectiousControlCaseBuilder from "../../src/admin/InfectiousControlCaseBuilder";
import { infectiousRoutingContent } from "../../src/routing/content-manifests";
import { INFECTIOUS_RULE_SET_V1 } from "../../src/routing/infectious-rules-v1";
import type {
  RoutingControlCase,
  RoutingProfileContentDocument,
} from "../../src/routing";

function Harness() {
  const [controlCases, setControlCases] = useState<readonly RoutingControlCase[]>([]);
  const document: RoutingProfileContentDocument = {
    ...infectiousRoutingContent,
    controlCases,
  };
  return (
    <InfectiousControlCaseBuilder
      document={document}
      ruleSet={INFECTIOUS_RULE_SET_V1}
      onChange={setControlCases}
    />
  );
}

describe("контрольные примеры инфекционного профиля", () => {
  it("автоматически создаёт проходящий пример для каждой ветки", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(
      screen.getByRole("button", {
        name: "Создать недостающие примеры автоматически",
      }),
    );

    expect(screen.getByText("Добавлено контрольных примеров: 10.")).toBeInTheDocument();
    expect(screen.getAllByText("Совпадает")).toHaveLength(10);
    expect(screen.getByText("Контроль ветки life_threat_general")).toBeInTheDocument();
  });
});

