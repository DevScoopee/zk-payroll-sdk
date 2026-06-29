export interface ErrorContext {
  transactionId?: string;
  contractId?: string;
  network?: string;
  [key: string]: unknown;
}

export class ZkPayrollError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context: ErrorContext = {}
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NetworkError extends ZkPayrollError {
  constructor(
    message: string,
    code: string = "NETWORK_ERROR",
    context: ErrorContext = {},
    public readonly statusCode?: number
  ) {
    super(message, code, context);
  }
}

export class ProofGenerationError extends ZkPayrollError {
  constructor(
    message: string,
    code: string = "PROOF_GENERATION_FAILED",
    context: ErrorContext = {}
  ) {
    super(message, code, context);
  }
}

export const ContractErrorCode = {
  SIMULATION_FAILED: "SIMULATION_FAILED",
  TRANSACTION_SUBMISSION_FAILED: "TRANSACTION_SUBMISSION_FAILED",
  TRANSACTION_TIMEOUT: "TRANSACTION_TIMEOUT",
  INSUFFICIENT_FEE: "INSUFFICIENT_FEE",
  CONTRACT_REVERT: "CONTRACT_REVERT",
  UNKNOWN_RPC_ERROR: "UNKNOWN_RPC_ERROR",
} as const;

export type ContractErrorCodeType = (typeof ContractErrorCode)[keyof typeof ContractErrorCode];

export class ContractExecutionError extends ZkPayrollError {
  constructor(
    message: string,
    code: ContractErrorCodeType = ContractErrorCode.UNKNOWN_RPC_ERROR,
    context: ErrorContext = {}
  ) {
    super(message, code, context);
  }
}

export class ValidationError extends ZkPayrollError {
  constructor(
    message: string,
    public readonly field: string,
    code: string = "VALIDATION_ERROR",
    context: ErrorContext = {}
  ) {
    super(message, code, context);
  }
}

/**
 * Default user-friendly messages mapped by error code.
 * Keys correspond to the `code` property on SDK error classes.
 */
export const DEFAULT_ERROR_MESSAGES: Record<string, string> = {
  [ContractErrorCode.SIMULATION_FAILED]:
    "The transaction could not be simulated. Please verify your inputs and network connection and try again.",
  [ContractErrorCode.TRANSACTION_SUBMISSION_FAILED]:
    "The transaction was rejected by the network. Please check your connection and try again.",
  [ContractErrorCode.TRANSACTION_TIMEOUT]:
    "The transaction did not confirm within the expected time. The network may be congested; please retry.",
  [ContractErrorCode.INSUFFICIENT_FEE]:
    "The transaction fee was too low. Try increasing the fee and submitting again.",
  [ContractErrorCode.CONTRACT_REVERT]:
    "The smart contract rejected the transaction. This may indicate invalid parameters or insufficient permissions.",
  [ContractErrorCode.UNKNOWN_RPC_ERROR]:
    "An unexpected error occurred while communicating with the blockchain network. Please try again.",
  NETWORK_ERROR: "A network error occurred. Please check your internet connection and try again.",
  PROOF_GENERATION_FAILED:
    "Zero-knowledge proof generation failed. This may be due to invalid inputs or insufficient system resources.",
  VALIDATION_ERROR:
    "The provided parameters failed validation. Please review your inputs and try again.",
  WALLET_NOT_INSTALLED: "The wallet extension is not installed. Please install it and try again.",
  WALLET_NOT_CONNECTED: "The wallet is not connected. Please connect your wallet and try again.",
  WALLET_CONNECTION_REJECTED:
    "The wallet connection request was rejected. Please approve the connection and try again.",
  WALLET_SIGNING_REJECTED:
    "The transaction signing request was rejected. Please approve the signature and try again.",
  WALLET_NETWORK_MISMATCH:
    "The wallet is on the wrong network. Please switch to the correct network and try again.",
  WALLET_INVALID_XDR: "The transaction data is invalid. This may indicate a software bug.",
  WALLET_UNKNOWN_ERROR: "An unexpected wallet error occurred. Please try again.",
};

/** Custom message overrides keyed by error code. */
export type ErrorMessageOverrides = Record<string, string>;

/**
 * Result of {@link toUserFriendlyError}.
 *
 * Contains both a human-readable message and the original diagnostic context
 * so callers can log the full technical details while displaying the friendly
 * version to end users.
 */
export interface UserFriendlyError {
  /** Human-readable description of the failure. */
  friendlyMessage: string;
  /** Error code from the original error (e.g. `"SIMULATION_FAILED"`). */
  code: string;
  /** Structured metadata from the original error. */
  context: ErrorContext;
  /** The original error object, preserved for lower-level diagnostics. */
  originalError: unknown;
}

function extractCodeAndContext(error: unknown): { code: string; context: ErrorContext } {
  if (typeof error === "object" && error !== null && "code" in error && "context" in error) {
    const err = error as { code: unknown; context: unknown };
    return {
      code: String(err.code ?? ContractErrorCode.UNKNOWN_RPC_ERROR),
      context: (typeof err.context === "object" && err.context !== null
        ? err.context
        : {}) as ErrorContext,
    };
  }

  if (typeof error === "object" && error !== null && "code" in error && "walletId" in error) {
    const err = error as { code: unknown; walletId: unknown };
    return {
      code: String(err.code),
      context: { walletId: String(err.walletId) } as ErrorContext,
    };
  }

  return { code: ContractErrorCode.UNKNOWN_RPC_ERROR, context: {} };
}

/**
 * Translates a raw chain, contract, or SDK error into a user-friendly message
 * while preserving the original diagnostic context.
 *
 * @param error  - The error to map (typed SDK error, `WalletError`, `Error`, or raw value).
 * @param overrides - Optional map of error codes to custom messages.
 *
 * @returns A {@link UserFriendlyError} with both a human-readable message and
 *          the original technical details.
 *
 * @example
 * ```ts
 * import { toUserFriendlyError, ContractExecutionError, ContractErrorCode } from "@zk-payroll/core";
 *
 * try {
 *   await contract.someMethod();
 * } catch (err) {
 *   const result = toUserFriendlyError(err);
 *   console.log(result.friendlyMessage); // "The transaction could not be simulated..."
 *   console.log(result.code);            // "SIMULATION_FAILED"
 *   console.log(result.context);         // { transactionId, contractId, ... }
 * }
 * ```
 *
 * **Customising messages:**
 * ```ts
 * const result = toUserFriendlyError(err, {
 *   SIMULATION_FAILED: "Custom simulation message",
 * });
 * ```
 */
export function toUserFriendlyError(
  error: unknown,
  overrides?: ErrorMessageOverrides
): UserFriendlyError {
  const { code, context } = extractCodeAndContext(error);
  const messages = { ...DEFAULT_ERROR_MESSAGES, ...overrides };
  const friendlyMessage =
    messages[code] ??
    messages[ContractErrorCode.UNKNOWN_RPC_ERROR] ??
    "An unexpected error occurred. Please try again.";

  return { friendlyMessage, code, context, originalError: error };
}

export function mapRpcError(error: unknown, context: ErrorContext = {}): ContractExecutionError {
  if (error instanceof ContractExecutionError) {
    return error;
  }

  const msg = error instanceof Error ? error.message : String(error);

  if (/simulate/i.test(msg)) {
    return new ContractExecutionError(
      `Simulation failed: ${msg}`,
      ContractErrorCode.SIMULATION_FAILED,
      context
    );
  }

  if (/fee|insufficient/i.test(msg)) {
    return new ContractExecutionError(
      `Insufficient fee: ${msg}`,
      ContractErrorCode.INSUFFICIENT_FEE,
      context
    );
  }

  if (/timeout|expired/i.test(msg)) {
    return new ContractExecutionError(
      `Transaction timed out: ${msg}`,
      ContractErrorCode.TRANSACTION_TIMEOUT,
      context
    );
  }

  if (/revert|trap|wasm/i.test(msg)) {
    return new ContractExecutionError(
      `Contract reverted: ${msg}`,
      ContractErrorCode.CONTRACT_REVERT,
      context
    );
  }

  if (/submit|send/i.test(msg)) {
    return new ContractExecutionError(
      `Transaction submission failed: ${msg}`,
      ContractErrorCode.TRANSACTION_SUBMISSION_FAILED,
      context
    );
  }

  return new ContractExecutionError(
    `Unknown RPC error: ${msg}`,
    ContractErrorCode.UNKNOWN_RPC_ERROR,
    context
  );
}
