/**
 * Audit View-Key Types
 *
 * Types that align the SDK's audit helpers with the contract-side
 * view-key capabilities exposed by the ZK Payroll smart contracts.
 */

/** Scope of data a view key permits an auditor to decrypt. */
export type ViewKeyScope = "read-only" | "full-audit";

/**
 * Input required to request a new audit view key.
 *
 * Provided by the admin (key granter) when creating access
 * for an external auditor.
 */
export interface ViewKeyRequest {
  /** Human-readable name of the auditor. */
  auditorName: string;
  /** Organisation the auditor represents (e.g. "Deloitte"). */
  auditorOrg: string;
  /**
   * Scope of access to grant.
   * - `"read-only"` — transaction summaries only.
   * - `"full-audit"` — summaries plus departmental breakdowns.
   */
  scope: ViewKeyScope;
  /**
   * Optional ISO-8601 expiry date-time.
   * Defaults to one year from the time of creation when omitted.
   */
  expiresAt?: string;
}

/**
 * A successfully created audit view key, ready to hand to an auditor.
 * Mirrors the `ViewKey` model but is narrowed to the fields a
 * compliance client actually needs when consuming the helper API.
 */
export interface ViewKeyResponse {
  /** Opaque record identifier (e.g. "vk_1719578400000"). */
  id: string;
  /** The shareable key token (e.g. "vk_a3f9bc12de45"). */
  keyId: string;
  auditorName: string;
  auditorOrg: string;
  scope: ViewKeyScope;
  /** Stellar public key of the admin who granted the key. */
  grantedBy: string;
  /** ISO-8601 timestamp of creation. */
  createdAt: string;
  /** ISO-8601 timestamp of expiry. */
  expiresAt: string;
  isActive: boolean;
}

/** Input required to revoke an existing audit view key. */
export interface ViewKeyRevokeRequest {
  /** The `id` field from `ViewKeyResponse` (e.g. "vk_1719578400000"). */
  id: string;
}

/** Result of a view-key revocation. */
export interface ViewKeyRevokeResult {
  id: string;
  revokedAt: string;
  success: boolean;
}

/** Status summary for a set of view keys, useful for compliance dashboards. */
export interface ViewKeyStatusSummary {
  totalActive: number;
  totalRevoked: number;
  totalExpired: number;
  keys: ViewKeyStatusEntry[];
}

export interface ViewKeyStatusEntry {
  id: string;
  keyId: string;
  auditorName: string;
  auditorOrg: string;
  scope: ViewKeyScope;
  status: "active" | "revoked" | "expired";
  expiresAt: string;
  revokedAt?: string;
}
