import { useState } from "react";
import ProfileSelect from "./ProfileSelect";
import type { ProfileKey } from "./ProfileSelect";

import OncologySMPRoutingMVP from "./OncologySMPRoutingMVP";
import RoutingWizard from "./RoutingWizard";

export default function App() {
  const [profile, setProfile] = useState<ProfileKey | null>(null);

  if (!profile) {
    return <ProfileSelect onSelect={setProfile} />;
  }

  const BackBar = () => (
    <div className="bg-neutral-50 px-4 pt-4">
      <div className="max-w-5xl mx-auto">
        <button
          type="button"
          className="px-3 py-2 rounded-2xl text-sm font-medium border border-neutral-200 bg-white hover:bg-neutral-50"
          onClick={() => setProfile(null)}
        >
          ← К выбору профиля
        </button>
      </div>
    </div>
  );

  if (profile === "oncology") {
    return (
      <>
        <BackBar />
        <OncologySMPRoutingMVP />
      </>
    );
  }

  return (
    <>
      <BackBar />
      <RoutingWizard />
    </>
  );
}