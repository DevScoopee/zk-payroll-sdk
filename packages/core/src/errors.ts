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

export class NetworkError extends ZkPayrollError {
  public statusCode?: number;

  constructor(
    message: string,
    code: any = "NETWORK_ERROR",
    context: Record<string, any> = {},
    statusCode?: number
  ) {
    super(message, code, context);
    this.name = "NetworkError";
    this.statusCode = statusCode;
  }
}

export class ProofGenerationError extends ZkPayrollError {
  constructor(
    message: string,
    code: any = "PROOF_GENERATION_FAILED",
    context: Record<string, any> = {}
  ) {
    super(message, code, context);
    this.name = "ProofGenerationError";
  }
}

export class ContractExecutionError extends ZkPayrollError {
  constructor(message: string, code: any = "UNKNOWN_RPC_ERROR", context: Record<string, any> = {}) {
    super(message, code, context);
    this.name = "ContractExecutionError";
  }
}

export class ValidationError extends ZkPayrollError {
  constructor(
    message: string,
    public field: string
  ) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
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

// Error codes for Soroban RPC failures
export const ContractErrorCode = {
  SIMULATION_FAILED: "SIMULATION_FAILED",
  TRANSACTION_SUBMISSION_FAILED: "TRANSACTION_SUBMISSION_FAILED",
  TRANSACTION_TIMEOUT: "TRANSACTION_TIMEOUT",
  INSUFFICIENT_FEE: "INSUFFICIENT_FEE",
  CONTRACT_REVERT: "CONTRACT_REVERT",
  UNKNOWN_RPC_ERROR: 1099,
} as const;

export type ContractErrorCode = (typeof ContractErrorCode)[keyof typeof ContractErrorCode];

// Error codes for PayrollService validation/orchestration failures
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

/**
 * Maps a generic error or RPC response code into a structured ContractExecutionError
 */
export function mapRpcError(error: any, context: Record<string, any> = {}): ContractExecutionError {
  if (error instanceof ContractExecutionError) {
    return error;
  }

  const message = error?.message || String(error);
  let code: any = ContractErrorCode.UNKNOWN_RPC_ERROR;

  if (message.includes("simulate") || message.includes("simulation")) {
    code = ContractErrorCode.SIMULATION_FAILED;
  } else if (message.includes("fee")) {
    code = ContractErrorCode.INSUFFICIENT_FEE;
  } else if (message.includes("timeout")) {
    code = ContractErrorCode.TRANSACTION_TIMEOUT;
  } else if (message.includes("submit") || message.includes("failed to submit")) {
    code = ContractErrorCode.TRANSACTION_SUBMISSION_FAILED;
  } else if (message.includes("revert") || message.includes("contract revert")) {
    code = ContractErrorCode.CONTRACT_REVERT;
  }

  return new ContractExecutionError(message, code, context);
}

/** @deprecated Use structured error logging instead. */
export function handleApiError(error: unknown): void {
  console.error("API Error:", error);
}