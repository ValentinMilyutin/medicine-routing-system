import { bskRoutingProfile } from "./bsk";
import { dermatologyRoutingProfile } from "./dermatology";
import { infectiousRoutingProfile } from "./infectious";
import { obstetricsRoutingProfile } from "./obstetrics";
import { oncologyRoutingProfile } from "./oncology";
import { roadAccidentRoutingProfile } from "./road-accident";
import type { RoutingProfileId, RoutingProfileSummary } from "./types";

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

export type { RoutingProfileId } from "./types";
