export type PublicSegment = {
  id: number;
  name: string;
  color: string;
  probabilityMilli: number;
  displayOrder: number;
  countsAsWin: boolean;
};

export type WheelResponse = {
  wheelName: string;
  isEnabled: boolean;
  configVersion: number;
  segments: PublicSegment[];
};

export type SpinResponse = {
  success: true;
  drawId: string;
  prizeId: number;
  prizeName: string;
  probability: string;
  probabilityMilli: number;
  configurationVersion: number;
  color: string;
  countsAsWin: boolean;
  landingRatio: number;
  configVersion: number;
  segments: PublicSegment[];
  createdAt: string;
  replayed: boolean;
};

export type AdminPrize = {
  id: number;
  name: string;
  probability: string;
  probabilityMilli: number;
  color: string;
  displayOrder: number;
  isActive: boolean;
  countsAsWin: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminSettings = {
  wheelName: string;
  isEnabled: boolean;
  configVersion: number;
  updatedAt: string;
};

export type DistributionRow = {
  prizeId: number;
  name: string;
  color: string;
  probability: string;
  isActive: boolean;
  spins: number;
};

export type SpinHistoryRow = {
  drawId: string;
  prizeId: number;
  prizeName: string;
  probability: string;
  countsAsWin: boolean;
  configVersion: number;
  createdAt: string;
};

export type AuditRow = {
  id: string;
  adminId: string;
  adminUsername: string;
  prizeId: number | null;
  oldProbability: string;
  newProbability: string;
  createdAt: string;
};

export type StatsResponse = {
  totalSpins: number;
  totalWins: number;
  configVersion: number;
  wheelName: string;
  isEnabled: boolean;
  distribution: DistributionRow[];
  orphans: Array<{ prizeId: number; name: string; spins: number }>;
  recent: SpinHistoryRow[];
};

export type SessionInfo = {
  id: string;
  username: string;
  csrfToken: string;
  totpEnabled: boolean;
};
