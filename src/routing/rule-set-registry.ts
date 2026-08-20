import { BSK_RULE_SET_V1 } from "./bsk-rules-v1.js";
import { DERMATOLOGY_RULE_SET_V1 } from "./dermatology-rules-v1.js";
import { INFECTIOUS_RULE_SET_V1 } from "./infectious-rules-v1.js";
import { ONCOLOGY_RULE_SET_V1 } from "./oncology-rules-v1.js";
import { OBSTETRICS_RULE_SET_V1 } from "./obstetrics-rules-v1.js";
import { ROAD_ACCIDENT_RULE_SET_V1 } from "./road-accident-rules-v1.js";
import type { RoutingRuleSetV1 } from "./rules-v1.js";

export const routingRuleSetRegistry = {
  "bsk.v1": BSK_RULE_SET_V1,
  "dermatology.v1": DERMATOLOGY_RULE_SET_V1,
  "infectious.v1": INFECTIOUS_RULE_SET_V1,
  "oncology.v1": ONCOLOGY_RULE_SET_V1,
  "obstetrics.v1": OBSTETRICS_RULE_SET_V1,
  "road-accident.v1": ROAD_ACCIDENT_RULE_SET_V1,
} as const satisfies Record<string, RoutingRuleSetV1>;
