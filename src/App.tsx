import { type ComponentType, useState } from "react";
import ProfileSelect from "./ProfileSelect";
import type { RoutingProfileId } from "./routing";
import AdminApp from "./admin/AdminApp";

import OncologySMPRoutingMVP from "./OncologySMPRoutingMVP";
import RoutingWizard from "./RoutingWizard";
import BSKSMPRoutingWizard from "./BSKSMPRoutingWizard";
import DermatovenerologySMPRoutingWizard from "./DermatovenerologySMPRoutingWizard";
import InfectiousDiseasesSMPRoutingWizard from "./InfectiousDiseasesSMPRoutingWizard";
import RoadAccidentSMPRoutingWizard from "./RoadAccidentSMPRoutingWizard";

const PROFILE_COMPONENTS: Record<RoutingProfileId, ComponentType> = {
  obgyn: RoutingWizard,
  oncology: OncologySMPRoutingMVP,
  bsk: BSKSMPRoutingWizard,
  dermatology: DermatovenerologySMPRoutingWizard,
  infectious: InfectiousDiseasesSMPRoutingWizard,
  road_accident: RoadAccidentSMPRoutingWizard,
};

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
  const [profile, setProfile] = useState<RoutingProfileId | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);

  if (adminOpen) {
    return <AdminApp onBack={() => setAdminOpen(false)} />;
  }

  if (!profile) {
    return (
      <ProfileSelect
        onSelect={setProfile}
        onAdmin={() => setAdminOpen(true)}
      />
    );
  }

  const ProfileComponent = PROFILE_COMPONENTS[profile];

  return (
    <>
      <BackBar onBack={() => setProfile(null)} />
      <ProfileComponent />
    </>
  );
}
