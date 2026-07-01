export {
  ZkPayrollError,
  NetworkError,
  ProofGenerationError,
  ContractExecutionError,
  ValidationError,
  ContractErrorCode,
  mapRpcError,
} from "./core/errors";
export type { ErrorContext, ContractErrorCodeType } from "./core/errors";

// ── Backward-compatible aliases ─────────────────────────────────────────────
import { ZkPayrollError } from "./core/errors";

/**
 * @deprecated Use `ZkPayrollError` instead.
 */
export class PayrollError extends ZkPayrollError {
  constructor(message: string, code: any, context: Record<string, any> = {}) {
    let sanitizedCode = code;
    if (typeof code === "number" && code < 2000) {
      sanitizedCode = String(code);
    }
    super(message, sanitizedCode, context);
    this.name = "PayrollError";
    (this as unknown as { code: number }).code = code;
  }
}

export class WalletError extends ZkPayrollError {
  constructor(
    message: string,
    code: string,
    public walletId?: string,
    context: Record<string, any> = {}
  ) {
    super(message, code, context);
    this.name = "WalletError";
  }
}

export class SerializationError extends ZkPayrollError {
  constructor(
    message: string,
    code: any = "SERIALIZATION_FAILED",
    context: Record<string, any> = {}
  ) {
    super(message, code, context);
    this.name = "SerializationError";
  }
}

/** Error codes for PayrollService validation/orchestration failures */
export const PayrollServiceErrorCode = {
  PROOF_GENERATION_FAILED: 2001,
  INVALID_RECIPIENT: 2002,
  INVALID_AMOUNT: 2003,
  INVALID_ASSET: 2004,
} as const;

export type PayrollServiceErrorCode =
  (typeof PayrollServiceErrorCode)[keyof typeof PayrollServiceErrorCode];

/**
 * Wallet error codes
 */
export const WalletErrorCode = {
  NOT_INSTALLED: "WALLET_NOT_INSTALLED",
  NOT_CONNECTED: "WALLET_NOT_CONNECTED",
  CONNECTION_REJECTED: "WALLET_CONNECTION_REJECTED",
  SIGNING_REJECTED: "WALLET_SIGNING_REJECTED",
  NETWORK_MISMATCH: "WALLET_NETWORK_MISMATCH",
  INVALID_XDR: "WALLET_INVALID_XDR",
  UNKNOWN_ERROR: "WALLET_UNKNOWN_ERROR",
} as const;

export type WalletErrorCode = (typeof WalletErrorCode)[keyof typeof WalletErrorCode];

/** @deprecated Use structured error logging instead. */
export function handleApiError(error: unknown): void {
  console.error("API Error:", error);
}