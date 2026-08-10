import { useState } from "react";
import ProfileSelect from "./ProfileSelect";
import type { ProfileKey } from "./ProfileSelect";

import OncologySMPRoutingMVP from "./OncologySMPRoutingMVP";
import RoutingWizard from "./RoutingWizard";
import BSKSMPRoutingWizard from "./BSKSMPRoutingWizard";
import DermatovenerologySMPRoutingWizard from "./DermatovenerologySMPRoutingWizard";
import InfectiousDiseasesSMPRoutingWizard from "./InfectiousDiseasesSMPRoutingWizard";

function BackBar(props: { onBack: () => void }) {
  return (
    <div className="bg-neutral-50 px-4 pt-4">
      <div className="max-w-5xl mx-auto">
        <button
          type="button"
          className="px-3 py-2 rounded-2xl text-sm font-medium border border-neutral-200 bg-white hover:bg-neutral-50"
          onClick={props.onBack}
        >
          ← К выбору профиля
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [profile, setProfile] = useState<ProfileKey | null>(null);

  if (!profile) {
    return <ProfileSelect onSelect={setProfile} />;
  }

  if (profile === "oncology") {
    return (
      <>
        <BackBar onBack={() => setProfile(null)} />
        <OncologySMPRoutingMVP />
      </>
    );
  }

  if (profile === "bsk") {
    return (
      <>
        <BackBar onBack={() => setProfile(null)} />
        <BSKSMPRoutingWizard />
      </>
    );
  }

  if (profile === "dermatology") {
    return (
      <>
        <BackBar onBack={() => setProfile(null)} />
        <DermatovenerologySMPRoutingWizard />
      </>
    );
  }

  if (profile === "infectious") {
    return (
      <>
        <BackBar onBack={() => setProfile(null)} />
        <InfectiousDiseasesSMPRoutingWizard />
      </>
    );
  }

  return (
    <>
      <BackBar onBack={() => setProfile(null)} />
      <RoutingWizard />
    </>
  );
}
