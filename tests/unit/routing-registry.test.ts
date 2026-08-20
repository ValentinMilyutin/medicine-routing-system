import { describe, expect, it } from "vitest";
import {
  routingProfileList,
  routingProfileRegistry,
  type RoutingProfileId,
} from "../../src/routing";

const EXPECTED_PROFILE_IDS: RoutingProfileId[] = [
  "obgyn",
  "oncology",
  "bsk",
  "dermatology",
  "infectious",
  "road_accident",
];

describe("единый реестр профилей маршрутизации", () => {
  it("содержит каждый профиль ровно один раз", () => {
    expect(routingProfileList.map((profile) => profile.id)).toEqual(
      EXPECTED_PROFILE_IDS,
    );
    expect(new Set(routingProfileList.map((profile) => profile.id)).size).toBe(
      EXPECTED_PROFILE_IDS.length,
    );
  });

  it.each(EXPECTED_PROFILE_IDS)(
    "%s связывает метаданные с расчётной функцией",
    (profileId) => {
      const profile = routingProfileRegistry[profileId];
      const summary = routingProfileList.find((item) => item.id === profileId);

      expect(profile.id).toBe(profileId);
      expect(profile.title).not.toHaveLength(0);
      expect(profile.description).not.toHaveLength(0);
      expect(profile.evaluate).toBeTypeOf("function");
      expect(summary).toEqual({
        id: profile.id,
        title: profile.title,
        description: profile.description,
        contentVersion: profile.content.contentVersion,
        status: profile.content.status,
      });
    },
  );
});
