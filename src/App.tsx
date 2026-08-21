import { lazy, Suspense, type ComponentType, useState } from "react";
import ProfileSelect from "./ProfileSelect";
import type { RoutingProfileId } from "./routing";

import OncologyDynamicRoutingWizard from "./OncologyDynamicRoutingWizard";
import ObstetricsDynamicRoutingWizard from "./ObstetricsDynamicRoutingWizard";
import BSKSMPRoutingWizard from "./BSKDynamicRoutingWizard";
import DermatovenerologySMPRoutingWizard from "./DermatologyDynamicRoutingWizard";
import InfectiousDiseasesSMPRoutingWizard from "./InfectiousDiseasesSMPRoutingWizard";
import RoadAccidentSMPRoutingWizard from "./RoadAccidentDynamicRoutingWizard";

const AdminApp = lazy(() => import("./admin/AdminApp"));

const PROFILE_COMPONENTS: Record<RoutingProfileId, ComponentType> = {
  obgyn: ObstetricsDynamicRoutingWizard,
  oncology: OncologyDynamicRoutingWizard,
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
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4 text-sm text-neutral-600">
            Загрузка административного контура…
          </div>
        }
      >
        <AdminApp onBack={() => setAdminOpen(false)} />
      </Suspense>
    );
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
