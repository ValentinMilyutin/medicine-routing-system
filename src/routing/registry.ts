import { bskRoutingProfile } from "./bsk.js";
import { dermatologyRoutingProfile } from "./dermatology.js";
import { infectiousRoutingProfile } from "./infectious.js";
import { obstetricsRoutingProfile } from "./obstetrics.js";
import { oncologyRoutingProfile } from "./oncology.js";
import { roadAccidentRoutingProfile } from "./road-accident.js";
import type { RoutingProfileId, RoutingProfileSummary } from "./types.js";

export const routingProfileRegistry = {
  obgyn: obstetricsRoutingProfile,
  oncology: oncologyRoutingProfile,
  bsk: bskRoutingProfile,
  dermatology: dermatologyRoutingProfile,
  infectious: infectiousRoutingProfile,
  road_accident: roadAccidentRoutingProfile,
} as const satisfies Record<RoutingProfileId, object>;

export const routingProfileList: readonly RoutingProfileSummary[] = Object.values(
  routingProfileRegistry,
).map(({ id, title, description, content }) => ({
  id,
  title,
  description,
  contentVersion: content.contentVersion,
  status: content.status,
}));

export type { RoutingProfileId } from "./types.js";
