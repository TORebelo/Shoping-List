import type { Timestamp } from "firebase/firestore";

export type Plan = "free" | "pro";

export type UserDoc = {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  householdIds: string[];
  plan: Plan;
  planExpiresAt?: Timestamp | null;
  createdAt: Timestamp;
};

export type HouseholdDoc = {
  id: string;
  name: string;
  createdBy: string;
  memberIds: string[];
  inviteCode: string;
  activeListId: string;
  createdAt: Timestamp;
};

export type MemberRole = "owner" | "member";

export type MemberDoc = {
  uid: string;
  displayName: string;
  color: string;
  role: MemberRole;
  joinedAt: Timestamp;
};

export type ListStatus = "active" | "closed";

export type ListDoc = {
  id: string;
  title: string;
  status: ListStatus;
  createdAt: Timestamp;
  closedAt?: Timestamp | null;
};

export type ItemDoc = {
  id: string;
  name: string;
  quantity: string;
  addedBy: string;
  addedByName: string;
  addedByColor: string;
  checked: boolean;
  checkedBy?: string | null;
  createdAt: Timestamp;
};

export const COLOR_POOL = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#a855f7",
  "#f97316",
  "#06b6d4",
  "#ec4899",
] as const;

export type Color = (typeof COLOR_POOL)[number];
