import type { RoutingProfileId } from "../routing";

export type FeedbackCategory =
  | "routing_error"
  | "address_outdated"
  | "document_outdated"
  | "suggestion"
  | "other";
export type FeedbackStatus = "new" | "in_progress" | "resolved" | "rejected";
export type DocumentStatus =
  | "active"
  | "needs_confirmation"
  | "expired"
  | "replaced"
  | "archived";
export type UsageEventType =
  | "profile_opened"
  | "route_completed"
  | "document_opened"
  | "feedback_submitted";

export type FeedbackRecipient = {
  id: string;
  email: string;
  label: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RoutingFeedback = {
  id: string;
  category: FeedbackCategory;
  message: string;
  profileId: RoutingProfileId | null;
  contentVersion: string | null;
  resultId: string | null;
  ruleId: string | null;
  status: FeedbackStatus;
  adminNote: string;
  notificationStatus: "pending" | "sent" | "not_configured" | "failed";
  notificationError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NormativeReference = {
  id: string;
  profileId: RoutingProfileId;
  sourceId: string | null;
  branchId: string | null;
  referenceLabel: string;
};

export type NormativeDocument = {
  id: string;
  code: string;
  title: string;
  issuer: string;
  documentNumber: string;
  issuedOn: string | null;
  status: DocumentStatus;
  officialUrl: string | null;
  storageProvider: "vercel_blob" | "external" | null;
  storageKey: string | null;
  fileUrl: string | null;
  downloadUrl: string | null;
  originalFilename: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  sha256: string | null;
  notes: string;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  references: NormativeReference[];
};

export type UsageStat = {
  eventDate: string;
  profileId: RoutingProfileId;
  contentVersion: string;
  eventType: UsageEventType;
  dimension: string;
  eventCount: number;
};

export type PublicRoutingContext = {
  profileId: RoutingProfileId;
  contentVersion: string;
  resultId?: string;
  ruleId?: string;
};
