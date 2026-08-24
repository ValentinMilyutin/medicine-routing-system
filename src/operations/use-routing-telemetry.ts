import { useEffect } from "react";
import type { RoutingProfileId } from "../routing";
import {
  reportRoutingCompletion,
  setPublicRoutingContext,
} from "./routing-context";

export function useRoutingTelemetry(input: {
  profileId: RoutingProfileId;
  contentVersion: string;
  resultId?: string;
  ruleId?: string;
}) {
  useEffect(() => {
    setPublicRoutingContext({
      profileId: input.profileId,
      contentVersion: input.contentVersion,
    });
  }, [input.contentVersion, input.profileId]);

  useEffect(() => {
    if (!input.resultId && !input.ruleId) return;
    reportRoutingCompletion({
      profileId: input.profileId,
      contentVersion: input.contentVersion,
      resultId: input.resultId,
      ruleId: input.ruleId,
    });
  }, [input.contentVersion, input.profileId, input.resultId, input.ruleId]);
}
