import {
  ONCOLOGY_TERRITORY_OPTIONS_V1,
} from "./oncology-rules-v1.js";
import {
  OBSTETRICS_TERRITORIES_BOROVICHI_V1,
  OBSTETRICS_TERRITORIES_NOVGOROD_V1,
  OBSTETRICS_TERRITORIES_STARAYA_RUSSA_V1,
  OBSTETRICS_TERRITORIES_VALDAI_V1,
} from "./obstetrics-rules-v1.js";
import type { RoutingProfileId } from "./types.js";

type EvaluationState = Readonly<Record<string, unknown>>;

const OBSTETRICS_TERRITORIES = new Set<string>([
  ...OBSTETRICS_TERRITORIES_BOROVICHI_V1,
  ...OBSTETRICS_TERRITORIES_STARAYA_RUSSA_V1,
  ...OBSTETRICS_TERRITORIES_VALDAI_V1,
  ...OBSTETRICS_TERRITORIES_NOVGOROD_V1,
  "Мошенской район",
  "Пестово",
]);

function obstetricsTerritoryGroup(territory: unknown): string {
  if (typeof territory !== "string") return "unknown";
  if ((OBSTETRICS_TERRITORIES_BOROVICHI_V1 as readonly string[]).includes(territory)) return "borovichi";
  if ((OBSTETRICS_TERRITORIES_STARAYA_RUSSA_V1 as readonly string[]).includes(territory)) return "staraya_russa";
  if ((OBSTETRICS_TERRITORIES_VALDAI_V1 as readonly string[]).includes(territory)) return "valdai";
  if ((OBSTETRICS_TERRITORIES_NOVGOROD_V1 as readonly string[]).includes(territory)) return "novgorod";
  return "unknown";
}

/**
 * Adds deterministic technical keys used by the executable catalogs. These
 * keys are derived from visible answers and are never editable patient fields.
 */
export function prepareRoutingEvaluationState(
  profileId: RoutingProfileId,
  state: EvaluationState,
): EvaluationState {
  if (profileId === "oncology") {
    const territory = state.territory;
    const territoryKey = typeof territory !== "string"
      ? "__missing__"
      : (ONCOLOGY_TERRITORY_OPTIONS_V1 as readonly string[]).includes(territory)
        ? territory
        : "__unknown__";
    return {
      ...state,
      territoryKey,
      palliativeFormatKey: typeof state.palliativeFormat === "string" ? state.palliativeFormat : "__missing__",
      medicalTransportNeededKey: state.medicalTransportNeeded === true ? "true" : "false",
      docsAvailableKey: state.docsAvailable === true ? "true" : "false",
      always: true,
    };
  }
  if (profileId === "obgyn") {
    const territory = state.territory;
    return {
      ...state,
      territoryKey: typeof territory !== "string"
        ? "__missing__"
        : OBSTETRICS_TERRITORIES.has(territory)
          ? territory
          : "__unknown__",
      territoryGroupKey: obstetricsTerritoryGroup(territory),
      criticalKindKey: typeof state.criticalKind === "string" ? state.criticalKind : "__missing__",
    };
  }
  return state;
}

export function routingDerivedFieldIds(profileId: RoutingProfileId): readonly string[] {
  if (profileId === "oncology") {
    return ["territoryKey", "palliativeFormatKey", "medicalTransportNeededKey", "docsAvailableKey", "always"];
  }
  if (profileId === "obgyn") {
    return ["territoryKey", "territoryGroupKey", "criticalKindKey"];
  }
  return [];
}
