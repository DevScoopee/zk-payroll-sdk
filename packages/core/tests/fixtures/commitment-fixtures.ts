import { CommitmentEntry, CommitRequest } from "../../src/clients/types";

// ═══════════════════════════════════════════════════════════════════════════════
// CommitmentEntry fixtures
// ═══════════════════════════════════════════════════════════════════════════════

/** Standard unrevealed commitment entry. */
export const COMMITMENT_ENTRY_NORMAL: CommitmentEntry = {
  employer: "GAEMPLOYER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  employee: "GAEMPLOYEE1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  commitmentHash: "a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff",
  cycleId: 7n,
  createdAt: 1735689600,
  revealed: false,
  actualAmount: 0n,
};

/** Commitment entry after reveal, with a large actualAmount and cycleId. */
export const COMMITMENT_ENTRY_REVEALED: CommitmentEntry = {
  employer: "GBEMPLOYER0987654321ZYXWVUTSRQPONMLKJIHGFEDCBA",
  employee: "GBEMPLOYEE0987654321ZYXWVUTSRQPONMLKJIHGFEDCBA",
  commitmentHash: "ffeeddccbbaa99887766554433221100ffeeddccbbaa998877665544332211",
  cycleId: 18446744073709551615n,
  createdAt: 1893456000.5,
  revealed: true,
  actualAmount: 9007199254740993n,
};

/** Edge-case commitment entry: zero/empty values and cycleId of 0. */
export const COMMITMENT_ENTRY_EDGE: CommitmentEntry = {
  employer: "",
  employee: "",
  commitmentHash: "",
  cycleId: 0n,
  createdAt: 0,
  revealed: false,
  actualAmount: 0n,
};

// ═══════════════════════════════════════════════════════════════════════════════
// CommitRequest fixtures
// ═══════════════════════════════════════════════════════════════════════════════

/** Standard commit request. */
export const COMMIT_REQUEST_NORMAL: CommitRequest = {
  employer: "GAEMPLOYER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  employee: "GAEMPLOYEE1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  commitmentHash: "a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff",
  cycleId: 1n,
};

/** Commit request with a very large cycleId and unicode in addresses. */
export const COMMIT_REQUEST_EDGE: CommitRequest = {
  employer: "G\u00e9mployer-üñîçødé",
  employee: "",
  commitmentHash: "0x",
  cycleId: 340282366920938463463374607431768211455n,
};
