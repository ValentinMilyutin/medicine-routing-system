import { type ComponentType, useEffect, useState } from "react";
import ProfileSelect from "./ProfileSelect";
import {
  routingContentDocuments,
  type RoutingProfileId,
} from "./routing";
import FeedbackWidget from "./operations/FeedbackWidget";
import PublicDocumentsPanel from "./operations/PublicDocumentsPanel";
import { recordUsageEvent } from "./operations/operations-api";
import {
  clearPublicRoutingContext,
  setPublicRoutingContext,
} from "./operations/routing-context";

import OncologyDynamicRoutingWizard from "./OncologyDynamicRoutingWizard";
import ObstetricsDynamicRoutingWizard from "./ObstetricsDynamicRoutingWizard";
import BSKSMPRoutingWizard from "./BSKDynamicRoutingWizard";
import DermatovenerologySMPRoutingWizard from "./DermatologyDynamicRoutingWizard";
import InfectiousDiseasesSMPRoutingWizard from "./InfectiousDiseasesSMPRoutingWizard";
import RoadAccidentSMPRoutingWizard from "./RoadAccidentDynamicRoutingWizard";
import AdminApp from "./admin/AdminApp";

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

function PublicProfileView(props: {
  profile: RoutingProfileId;
  onBack: () => void;
}) {
  const ProfileComponent = PROFILE_COMPONENTS[props.profile];
  const fallbackVersion = routingContentDocuments.find(
    (document) => document.profileId === props.profile,
  )!.contentVersion;

  useEffect(() => {
    setPublicRoutingContext({
      profileId: props.profile,
      contentVersion: fallbackVersion,
    });
    recordUsageEvent({
      profileId: props.profile,
      contentVersion: fallbackVersion,
      eventType: "profile_opened",
    });
  }, [fallbackVersion, props.profile]);

  return (
    <>
      <BackBar onBack={props.onBack} />
      <ProfileComponent />
      <PublicDocumentsPanel
        profileId={props.profile}
        contentVersion={fallbackVersion}
      />
      <FeedbackWidget
        profileId={props.profile}
        fallbackVersion={fallbackVersion}
      />
    </>
  );
}

export default function App() {
  const [profile, setProfile] = useState<RoutingProfileId | null>(null);
  const [adminOpen, setAdminOpen] = useState(
    () => new URLSearchParams(window.location.search).get("admin") === "1",
  );

  if (adminOpen) {
    return <AdminApp onBack={() => { clearPublicRoutingContext(); setAdminOpen(false); }} />;
  }

  if (!profile) {
    return (
      <>
        <ProfileSelect
          onSelect={setProfile}
          onAdmin={() => setAdminOpen(true)}
        />
        <FeedbackWidget />
      </>
    );
  }

  return <PublicProfileView profile={profile} onBack={() => { clearPublicRoutingContext(); setProfile(null); }} />;
}
