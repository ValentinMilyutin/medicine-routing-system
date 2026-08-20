import { describe, expect, it } from "vitest";
import { DERMATOLOGY_RULE_SET_V1 } from "../../src/routing/dermatology-rules-v1";
import {
  evaluateRouting,
  evaluateRoutingLegacy,
  type Condition,
  type FormState,
  TERRITORIES,
} from "../../src/routing/dermatology";
import { INFECTIOUS_RULE_SET_V1 } from "../../src/routing/infectious-rules-v1";
import {
  evaluateRouting as evaluateInfectiousRouting,
  evaluateRoutingLegacy as evaluateInfectiousRoutingLegacy,
  type AnyAdmissionCriterion,
  type FormState as InfectiousFormState,
  type InfectionGroup,
  type LifeThreat,
  TERRITORIES as INFECTIOUS_TERRITORIES,
} from "../../src/routing/infectious";
import {
  evaluateRouting as evaluateRoadAccidentRouting,
  evaluateRoutingLegacy as evaluateRoadAccidentRoutingLegacy,
  type AgeGroup,
  type FormState as RoadAccidentFormState,
  type InjuryCriterion,
  type M10Zone,
  type M11Responder,
  type M11Zone,
  TERRITORIES as ROAD_ACCIDENT_TERRITORIES,
} from "../../src/routing/road-accident";
import {
  evalRouting as evaluateOncologyRouting,
  evalRoutingLegacy as evaluateOncologyRoutingLegacy,
  type FormState as OncologyFormState,
  GENERAL_EMERGENCY_SIGNS as ONCOLOGY_GENERAL_SIGNS,
  type LeadingSign,
  type OncologyStatus,
  PALLIATIVE_SYMPTOM_SIGNS as ONCOLOGY_PALLIATIVE_SIGNS,
  type PalliativeFormat,
  SURGICAL_SYNDROME_SIGNS as ONCOLOGY_SURGICAL_SIGNS,
  TERRITORY_OPTIONS as ONCOLOGY_TERRITORIES,
} from "../../src/routing/oncology";
import {
  type ArmMovement,
  type Branch as BskBranch,
  type BSKFormState,
  evaluateRouting as evaluateBskRouting,
  evaluateRoutingLegacy as evaluateBskRoutingLegacy,
  type GripStrength,
  TERRITORIES as BSK_TERRITORIES,
} from "../../src/routing/bsk";
import {
  type CriticalKind,
  type CriticalRoute,
  evalRouting as evaluateObstetricsRouting,
  evalRoutingLegacy as evaluateObstetricsRoutingLegacy,
  type FormState as ObstetricsFormState,
  type PostpartumIssue,
  type RiskGroup,
  type Scenario as ObstetricsScenario,
  TERRITORIES_BOROVICHI as OBSTETRICS_BOROVICHI,
  TERRITORIES_NOVGOROD as OBSTETRICS_NOVGOROD,
  TERRITORIES_STARAYA_RUSSA as OBSTETRICS_STARAYA_RUSSA,
  TERRITORIES_VALDAI as OBSTETRICS_VALDAI,
} from "../../src/routing/obstetrics";
import {
  evaluateRoutingRuleSetV1,
  matchesRoutingConditionV1,
  parseRoutingRuleSetV1,
  routingContentDocuments,
  routingRuleSetRegistry,
  validateRoutingRuleSetV1,
  type RoutingRuleSetV1,
} from "../../src/routing";

describe("интерпретатор rules_v1", () => {
  it("поддерживает композицию безопасных условий", () => {
    const input = { status: "urgent", signs: ["shock"], enabled: true };
    expect(
      matchesRoutingConditionV1(
        {
          op: "all",
          conditions: [
            { op: "present", field: "status" },
            { op: "neq", field: "status", value: "planned" },
            { op: "includes", field: "signs", value: "shock" },
            {
              op: "not",
              condition: { op: "eq", field: "enabled", value: false },
            },
          ],
        },
        input,
      ),
    ).toBe(true);
  });

  it("подставляет поля, каталоги и составные строки без eval", () => {
    const evaluation = evaluateRoutingRuleSetV1(
      DERMATOLOGY_RULE_SET_V1,
      {
        territory: "Боровичский район",
        condition: "angioedema",
      },
    );

    expect(evaluation?.ruleId).toBe("emergency_icu");
    expect(evaluation?.result).toMatchObject({
      title: "Отёк Квинке: экстренная госпитализация",
      urgency: "Экстренно",
    });
  });

  it("собирает подписи массивов через разрешённый каталог", () => {
    const evaluation = evaluateRoutingRuleSetV1(INFECTIOUS_RULE_SET_V1, {
      territory: "Великий Новгород",
      infectionGroup: "general",
      lifeThreats: ["none"],
      admissionCriteria: ["moderate", "epidemiological"],
    });
    const result = evaluation?.result as { handoff?: string[] };

    expect(evaluation?.ruleId).toBe("territorial_direct");
    expect(result.handoff?.[0]).toContain("Среднетяжёлое течение");
    expect(result.handoff?.[0]).toContain("эпидемиологические показания");
  });

  it("валидирует и восстанавливает набор правил из JSON", () => {
    expect(validateRoutingRuleSetV1(DERMATOLOGY_RULE_SET_V1)).toEqual([]);
    expect(
      parseRoutingRuleSetV1(JSON.stringify(DERMATOLOGY_RULE_SET_V1)),
    ).toEqual(DERMATOLOGY_RULE_SET_V1);
  });

  it("отклоняет неизвестные операторы, повторные приоритеты и опасные свойства", () => {
    const invalid = JSON.parse(
      JSON.stringify(DERMATOLOGY_RULE_SET_V1),
    ) as Record<string, unknown>;
    const rules = invalid.rules as Array<Record<string, unknown>>;
    rules[0].when = { op: "execute_code", field: "territory" };
    rules[1].priority = rules[0].priority;
    rules[2].result = JSON.parse('{"__proto__":{"polluted":true}}') as unknown;

    const messages = validateRoutingRuleSetV1(invalid).map(
      (issue) => issue.message,
    );
    expect(messages.some((message) => message.includes("Неизвестный оператор"))).toBe(true);
    expect(messages.some((message) => message.includes("Повторяется приоритет"))).toBe(true);
    expect(messages.some((message) => message.includes("Запрещённое имя"))).toBe(true);
  });

  it("каждый профиль с rules_v1 ссылается на зарегистрированный набор", () => {
    const registry: Readonly<Record<string, RoutingRuleSetV1>> =
      routingRuleSetRegistry;

    routingContentDocuments.forEach((document) => {
      if (document.execution.kind !== "rules_v1") return;
      const ruleSet = registry[document.execution.ruleSetId];
      expect(ruleSet, document.execution.ruleSetId).toBeDefined();
      expect(ruleSet.profileId).toBe(document.profileId);
      expect(validateRoutingRuleSetV1(ruleSet)).toEqual([]);
    });
  });
});

describe("дерматовенерология: параллельная проверка legacy и rules_v1", () => {
  const territories = [
    undefined,
    "Несуществующая территория",
    ...TERRITORIES.map((territory) => territory.name),
  ];
  const conditions: Array<Condition | undefined> = [
    undefined,
    "angioedema",
    "toxicoderma",
    "lyell",
    "stevens_johnson",
    "none",
  ];
  const inpatientValues = [undefined, false, true];

  it("совпадает на полном декартовом наборе допустимых состояний", () => {
    let checked = 0;
    territories.forEach((territory) => {
      conditions.forEach((condition) => {
        inpatientValues.forEach((inpatientCare) => {
          const state: FormState = { territory, condition, inpatientCare };
          expect(evaluateRouting(state)).toEqual(evaluateRoutingLegacy(state));
          checked += 1;
        });
      });
    });

    expect(checked).toBe(432);
  });
});

describe("инфекционный профиль: параллельная проверка legacy и rules_v1", () => {
  const territories = [
    undefined,
    "Несуществующая территория",
    ...INFECTIOUS_TERRITORIES.map((territory) => territory.name),
  ];
  const infectionGroups: Array<InfectionGroup | undefined> = [
    undefined,
    "general",
    "flu_orvi_vp",
    "covid",
  ];
  const lifeThreatSets: LifeThreat[][] = [
    [],
    ["none"],
    ["respiratory_failure"],
    ["none", "infectious_toxic_shock"],
    [
      "infectious_toxic_shock",
      "hypovolemic_shock",
      "cerebral_edema",
      "renal_failure",
      "hepatic_failure",
      "cardiovascular_failure",
      "respiratory_failure",
    ],
  ];
  const admissionSets: AnyAdmissionCriterion[][] = [
    [],
    ["none"],
    ["severe"],
    ["moderate"],
    ["resp_pneumonia"],
    ["severe", "none"],
    ["moderate", "epidemiological"],
    [
      "severe",
      "moderate",
      "diagnosis_unavailable",
      "differential_diagnostics",
      "no_outpatient_effect",
      "epidemiological",
      "unclear_infectious_diagnosis",
    ],
    [
      "resp_fever_5_days",
      "resp_fever_hypoxemia",
      "resp_pneumonia",
      "resp_severe_course",
      "resp_medical_risk",
      "resp_pregnancy",
      "resp_isolation_impossible",
      "resp_no_monitoring",
    ],
  ];
  const transportableValues = [undefined, false, true];

  it("совпадает на расширенной матрице взрослых пациентов", () => {
    let checked = 0;
    territories.forEach((territory) => {
      infectionGroups.forEach((infectionGroup) => {
        lifeThreatSets.forEach((lifeThreats) => {
          admissionSets.forEach((admissionCriteria) => {
            transportableValues.forEach((transportable) => {
              const state: InfectiousFormState = {
                territory,
                infectionGroup,
                lifeThreats,
                admissionCriteria,
                transportable,
              };
              expect(evaluateInfectiousRouting(state)).toEqual(
                evaluateInfectiousRoutingLegacy(state),
              );
              checked += 1;
            });
          });
        });
      });
    });

    expect(checked).toBe(12_960);
  });
});

describe("ДТП: параллельная проверка legacy и rules_v1", () => {
  const ageGroups: Array<AgeGroup | undefined> = [
    undefined,
    "child_0_15",
    "age_16_17",
    "adult_18_plus",
  ];
  const injuryCriteria: Array<InjuryCriterion | undefined> = [
    undefined,
    "severe_tbi_or_shock",
    "specialized_injury",
    "other_without_shock",
    "stable_isolated_limb",
    "life_saving_10_20",
  ];
  const territories = [
    undefined,
    "Несуществующая территория",
    ...ROAD_ACCIDENT_TERRITORIES.map((territory) => territory.name),
  ];
  const m10Zones: Array<M10Zone | undefined> = [
    undefined,
    "valdai_kresttsy",
    "zaytsevo_novgorod_chudovo",
  ];
  const m11Responders: Array<M11Responder | undefined> = [
    undefined,
    "novgorod_smp",
    "nokb_cmk",
    "valdai_mmc",
  ];
  const m11Zones: Array<M11Zone | undefined> = [
    undefined,
    "570_474",
    "474_389",
    "570_389",
    "389_444",
  ];

  it("совпадает на полной матрице территории, М-10 и М-11", () => {
    let checked = 0;
    territories.forEach((territory) => {
      ageGroups.forEach((ageGroup) => {
        injuryCriteria.forEach((injuryCriterion) => {
          const state: RoadAccidentFormState = {
            locationKind: "territory",
            territory,
            ageGroup,
            injuryCriterion,
          };
          expect(evaluateRoadAccidentRouting(state)).toEqual(
            evaluateRoadAccidentRoutingLegacy(state),
          );
          checked += 1;
        });
      });
    });

    m10Zones.forEach((m10Zone) => {
      ageGroups.forEach((ageGroup) => {
        injuryCriteria.forEach((injuryCriterion) => {
          const state: RoadAccidentFormState = {
            locationKind: "m10",
            m10Zone,
            ageGroup,
            injuryCriterion,
          };
          expect(evaluateRoadAccidentRouting(state)).toEqual(
            evaluateRoadAccidentRoutingLegacy(state),
          );
          checked += 1;
        });
      });
    });

    m11Responders.forEach((m11Responder) => {
      m11Zones.forEach((m11Zone) => {
        ageGroups.forEach((ageGroup) => {
          injuryCriteria.forEach((injuryCriterion) => {
            const state: RoadAccidentFormState = {
              locationKind: "m11",
              m11Responder,
              m11Zone,
              ageGroup,
              injuryCriterion,
            };
            expect(evaluateRoadAccidentRouting(state)).toEqual(
              evaluateRoadAccidentRoutingLegacy(state),
            );
            checked += 1;
          });
        });
      });
    });

    const incompleteState: RoadAccidentFormState = {
      ageGroup: "adult_18_plus",
      injuryCriterion: "other_without_shock",
    };
    expect(evaluateRoadAccidentRouting(incompleteState)).toEqual(
      evaluateRoadAccidentRoutingLegacy(incompleteState),
    );
    checked += 1;

    expect(checked).toBe(1_129);
  });
});

describe("онкология: параллельная проверка legacy и rules_v1", () => {
  const territories = [
    undefined,
    "Неизвестная территория",
    ...ONCOLOGY_TERRITORIES,
  ];
  const oncologyStatuses: Array<OncologyStatus | undefined> = [
    undefined,
    "confirmed_known",
    "suspected_only",
    "unknown",
  ];
  const booleanValues = [undefined, false, true];
  const palliativeFormats: Array<PalliativeFormat | undefined> = [
    undefined,
    "outpatient",
    "inpatient",
    "nursing_care",
  ];
  const allSigns = [
    ...new Set<LeadingSign>([
      ...ONCOLOGY_GENERAL_SIGNS,
      ...ONCOLOGY_SURGICAL_SIGNS,
      ...ONCOLOGY_PALLIATIVE_SIGNS,
      "mi_or_stroke_suspected",
      "other_known_cancer_emergency",
    ]),
  ];
  const signSets: LeadingSign[][] = [
    [],
    ...allSigns.map((sign) => [sign]),
    [
      "mi_or_stroke_suspected",
      "intestinal_obstruction_suspected",
      "respiratory_failure",
    ],
    ["intestinal_obstruction_suspected", "respiratory_failure"],
    ["respiratory_failure", "uncontrolled_cancer_pain"],
    ["other_known_cancer_emergency", "uncontrolled_cancer_pain"],
    ["mi_or_stroke_suspected", "uncontrolled_cancer_pain"],
  ];

  function expectParity(state: OncologyFormState) {
    expect(evaluateOncologyRouting(state)).toEqual(
      evaluateOncologyRoutingLegacy(state),
    );
  }

  it("совпадает на расширенной матрице приоритетов и территориальных вариантов", () => {
    let checked = 0;

    oncologyStatuses.forEach((oncologyStatus) => {
      booleanValues.forEach((medicalTransportNeeded) => {
        booleanValues.forEach((palliativeProfileKnown) => {
          palliativeFormats.forEach((palliativeFormat) => {
            booleanValues.forEach((docsAvailable) => {
              signSets.forEach((leadingSigns) => {
                expectParity({
                  territory: "Великий Новгород",
                  oncologyStatus,
                  medicalTransportNeeded,
                  palliativeProfileKnown,
                  palliativeFormat,
                  docsAvailable,
                  leadingSigns,
                });
                checked += 1;
              });
            });
          });
        });
      });
    });

    const routeScenarios: Array<Partial<OncologyFormState>> = [
      { oncologyStatus: "suspected_only" },
      { leadingSigns: ["mi_or_stroke_suspected"] },
      { leadingSigns: ["intestinal_obstruction_suspected"] },
      {
        oncologyStatus: "suspected_only",
        leadingSigns: ["intestinal_obstruction_suspected"],
      },
      { leadingSigns: ["respiratory_failure"] },
      { palliativeProfileKnown: true, palliativeFormat: "outpatient" },
      { medicalTransportNeeded: true },
      {},
    ];
    territories.forEach((territory) => {
      routeScenarios.forEach((patch) => {
        expectParity({
          territory,
          oncologyStatus: "confirmed_known",
          leadingSigns: [],
          ...patch,
        });
        checked += 1;
      });
    });

    territories.forEach((territory) => {
      palliativeFormats.forEach((palliativeFormat) => {
        booleanValues.forEach((medicalTransportNeeded) => {
          booleanValues.forEach((docsAvailable) => {
            expectParity({
              territory,
              oncologyStatus: "confirmed_known",
              leadingSigns: [],
              palliativeProfileKnown: true,
              palliativeFormat,
              medicalTransportNeeded,
              docsAvailable,
            });
            checked += 1;
          });
        });
      });
    });

    expect(checked).toBe(11_080);
  });
});

describe("БСК: параллельная проверка legacy и rules_v1", () => {
  const territories = [
    undefined,
    "Неизвестная территория",
    ...BSK_TERRITORIES.map(({ name }) => name),
  ];
  const branches: BskBranch[] = ["stroke", "acs", "other_cvd", "kink"];
  const booleanValues = [undefined, false, true];
  const armMovements: Array<ArmMovement | undefined> = [
    undefined,
    "holds",
    "drifts",
    "falls",
  ];
  const gripStrengths: Array<GripStrength | undefined> = [
    undefined,
    "normal",
    "weak",
    "absent",
  ];

  function expectParity(state: BSKFormState) {
    expect(evaluateBskRouting(state)).toEqual(evaluateBskRoutingLegacy(state));
  }

  it("совпадает на полной матрице критериев всех четырёх веток", () => {
    let checked = 0;

    territories.forEach((territory) => {
      branches.forEach((branch) => {
        expectParity({
          territory,
          branch,
          unstableVitals: true,
          onsetWithin5h: true,
          stElevation: true,
          pciWithin120: true,
          restPain: true,
        });
        checked += 1;
      });
    });

    territories.forEach((territory) => {
      booleanValues.forEach((fastFace) => {
        booleanValues.forEach((fastArm) => {
          booleanValues.forEach((fastSpeech) => {
            booleanValues.forEach((onsetWithin5h) => {
              armMovements.forEach((armMovement) => {
                gripStrengths.forEach((gripStrength) => {
                  expectParity({
                    territory,
                    branch: "stroke",
                    fastFace,
                    fastArm,
                    fastSpeech,
                    onsetWithin5h,
                    armMovement,
                    gripStrength,
                  });
                  checked += 1;
                });
              });
            });
          });
        });
      });
    });

    territories.forEach((territory) => {
      booleanValues.forEach((stElevation) => {
        booleanValues.forEach((pciWithin120) => {
          booleanValues.forEach((tltContraindications) => {
            booleanValues.forEach((nsteHighRisk) => {
              expectParity({
                territory,
                branch: "acs",
                stElevation,
                pciWithin120,
                tltContraindications,
                nsteHighRisk,
              });
              checked += 1;
            });
          });
        });
      });
    });

    territories.forEach((territory) => {
      booleanValues.forEach((rhythmDisorder) => {
        booleanValues.forEach((conductionDisorder) => {
          booleanValues.forEach((suspectedPE) => {
            booleanValues.forEach((acuteHeartFailure) => {
              expectParity({
                territory,
                branch: "other_cvd",
                rhythmDisorder,
                conductionDisorder,
                suspectedPE,
                acuteHeartFailure,
              });
              checked += 1;
            });
          });
        });
      });
    });

    territories.forEach((territory) => {
      booleanValues.forEach((restPain) => {
        booleanValues.forEach((legDownAtNight) => {
          booleanValues.forEach((trophicChanges) => {
            booleanValues.forEach((necrosisGangrene) => {
              booleanValues.forEach((infectionSigns) => {
                expectParity({
                  territory,
                  branch: "kink",
                  restPain,
                  legDownAtNight,
                  trophicChanges,
                  necrosisGangrene,
                  infectionSigns,
                });
                checked += 1;
              });
            });
          });
        });
      });
    });

    expect(checked).toBe(40_920);
  });
});

describe("акушерство: параллельная проверка legacy и rules_v1", () => {
  const territories = [
    undefined,
    "Неизвестная территория",
    ...new Set([
      ...OBSTETRICS_BOROVICHI,
      ...OBSTETRICS_STARAYA_RUSSA,
      ...OBSTETRICS_VALDAI,
      ...OBSTETRICS_NOVGOROD,
      "Мошенской район",
      "Пестово",
    ]),
  ];
  const scenarios: Array<ObstetricsScenario | undefined> = [
    undefined,
    "gyne_lt37",
    "obstetrics_ge37",
    "postpartum_le42",
  ];
  const booleanValues = [undefined, false, true];
  const criticalRoutes: Array<CriticalRoute | undefined> = [
    undefined,
    "kas_arkc",
    "profile_nokb",
  ];
  const riskGroups: Array<RiskGroup | undefined> = [
    undefined,
    "low",
    "mid",
    "high",
  ];
  const postpartumIssues: Array<PostpartumIssue | undefined> = [
    undefined,
    "bleeding",
    "sepsis_fever",
    "seizures_hypertensive",
    "resp_failure",
    "teo_cardiac",
    "postop_pain_other",
  ];
  const criticalKinds: Array<CriticalKind | undefined> = [
    undefined,
    "bleeding",
    "preeclampsia_eclampsia",
    "sepsis_shock",
    "resp_failure",
    "teo_cardiac",
    "other",
  ];
  const overrideStates: Array<Partial<ObstetricsFormState>> = [
    {},
    { infectionType: "flu_covid" },
    { infectionType: "arvi_pneumo" },
    { infectionType: "arvi_pneumo", infectionSevere: true },
    {
      infectionType: "arvi_pneumo",
      infectionSevere: true,
      infectionOver7Days: false,
    },
    {
      infectionType: "arvi_pneumo",
      infectionSevere: true,
      infectionOver7Days: true,
    },
    { trauma: true },
    { trauma: true, traumaSevere: false },
    { trauma: true, traumaSevere: true },
    { surgery: true, surgeryLifeThreat: false },
    { surgery: true, surgeryLifeThreat: true },
    { surgery: true, surgeryLifeThreat: true, surgeryProfile: "city" },
    { surgery: true, surgeryLifeThreat: true, surgeryProfile: "regional" },
    { extragenitalInpatient: true },
    { critical: true },
    { critical: true, criticalRoute: "kas_arkc" },
    { critical: true, criticalRoute: "profile_nokb" },
    {
      infectionType: "flu_covid",
      trauma: true,
      traumaSevere: true,
      surgery: true,
      surgeryLifeThreat: true,
      extragenitalInpatient: true,
      critical: true,
    },
    {
      trauma: true,
      traumaSevere: false,
      surgery: true,
      surgeryLifeThreat: true,
      critical: true,
    },
    {
      surgery: true,
      surgeryLifeThreat: false,
      extragenitalInpatient: true,
      critical: true,
    },
  ];

  function expectParity(state: ObstetricsFormState) {
    expect(evaluateObstetricsRouting(state)).toEqual(
      evaluateObstetricsRoutingLegacy(state),
    );
  }

  it("совпадает на матрице переопределений и трёх профильных сценариев", () => {
    let checked = 0;

    territories.forEach((territory) => {
      scenarios.forEach((scenario) => {
        overrideStates.forEach((patch) => {
          expectParity({ territory, scenario, ...patch });
          checked += 1;
        });
      });
    });

    territories.forEach((territory) => {
      booleanValues.forEach((critical) => {
        expectParity({ scenario: "gyne_lt37", territory, critical });
        checked += 1;
      });
    });

    territories.forEach((territory) => {
      booleanValues.forEach((critical) => {
        criticalRoutes.forEach((criticalRoute) => {
          booleanValues.forEach((pretermLabor) => {
            booleanValues.forEach((canDeliverToNokpc) => {
              riskGroups.forEach((riskDelivery) => {
                expectParity({
                  scenario: "obstetrics_ge37",
                  territory,
                  critical,
                  criticalRoute,
                  pretermLabor,
                  canDeliverToNokpc,
                  riskDelivery,
                });
                checked += 1;
              });
            });
          });
        });
      });
    });

    territories.forEach((territory) => {
      booleanValues.forEach((critical) => {
        criticalRoutes.forEach((criticalRoute) => {
          postpartumIssues.forEach((postpartumIssue) => {
            expectParity({
              scenario: "postpartum_le42",
              territory,
              critical,
              criticalRoute,
              postpartumIssue,
            });
            checked += 1;
          });
        });
      });
    });

    (["obstetrics_ge37", "postpartum_le42"] as const).forEach((scenario) => {
      criticalRoutes.slice(1).forEach((criticalRoute) => {
        criticalKinds.forEach((criticalKind) => {
          expectParity({
            scenario,
            territory: "Великий Новгород",
            critical: true,
            criticalRoute,
            criticalKind,
          });
          checked += 1;
        });
      });
    });

    expect(checked).toBe(13_188);
  });
});
