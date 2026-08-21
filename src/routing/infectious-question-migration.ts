import { infectiousRoutingContent } from "./content-manifests.js";
import type { RoutingProfileContentDocument } from "./content-schema.js";
import type { RoutingRuleSetV1 } from "./rules-v1.js";

const OPTION_CATALOGS: Readonly<Record<string, readonly string[]>> = {
  infectionGroup: ["groupLabels"],
  lifeThreats: ["lifeThreatLabels"],
  admissionCriteria: ["admissionGeneral", "admissionRespiratory"],
};

export function hydrateLegacyInfectiousQuestions(
  document: RoutingProfileContentDocument,
  ruleSet: RoutingRuleSetV1,
): RoutingProfileContentDocument {
  if (document.profileId !== "infectious") return document;
  const defaults = new Map(
    infectiousRoutingContent.questions.map((question) => [question.id, question]),
  );
  return {
    ...document,
    questions: document.questions.map((question) => {
      const fallback = defaults.get(question.id);
      if (!fallback || question.options !== undefined) return question;
      return {
        ...fallback,
        ...question,
        helpText: question.helpText ?? fallback.helpText,
        placeholder: question.placeholder ?? fallback.placeholder,
        visibility: question.visibility ?? fallback.visibility,
        options: fallback.options?.map((option) => {
          const label = (OPTION_CATALOGS[question.id] ?? [])
            .map(
              (catalogId) =>
                ruleSet.catalogs[catalogId]?.[String(option.value)],
            )
            .find((value): value is string => typeof value === "string");
          return label ? { ...option, label } : option;
        }),
      };
    }),
  };
}
