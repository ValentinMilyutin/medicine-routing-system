import type {
  RoutingContentStatus,
  RoutingProfileContentDocument,
} from "./content-schema";

export type RoutingProfileId =
  | "obgyn"
  | "oncology"
  | "bsk"
  | "dermatology"
  | "infectious"
  | "road_accident";

export type RoutingProfileDefinition<State, Result> = {
  id: RoutingProfileId;
  title: string;
  description: string;
  content: RoutingProfileContentDocument;
  evaluate: (state: State) => Result | null;
};

export type RoutingProfileSummary = {
  id: RoutingProfileId;
  title: string;
  description: string;
  contentVersion: string;
  status: RoutingContentStatus;
};
