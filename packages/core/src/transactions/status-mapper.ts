import { rpc } from "@stellar/stellar-sdk";
import { NormalizedTransactionStatus } from "./types";

/**
 * Converts raw Stellar or RPC transaction responses into normalized payroll transaction statuses.
 * This ensures dashboards and UI components can rely on a consistent status shape
 * regardless of underlying RPC differences.
 *
 * @param response The raw RPC transaction response
 * @returns A NormalizedTransactionStatus object mapping the RPC state to a uniform status
 */
export function mapTransactionStatus(
  response: rpc.Api.GetTransactionResponse | null | undefined
): NormalizedTransactionStatus {
  if (!response) {
    return {
      status: "unknown",
      errorDetails: "Missing or null RPC response",
    };
  }

  // Attempt to extract the hash if available
  const txHash = "hash" in response ? (response as Record<string, unknown>).hash as string | undefined : undefined;

  switch (response.status) {
    case rpc.Api.GetTransactionStatus.SUCCESS: {
      const successRes = response as rpc.Api.GetSuccessfulTransactionResponse;
      return {
        status: "confirmed",
        rawStatus: response.status,
        txHash,
        ledger: successRes.ledger,
        createdAt: successRes.createdAt,
      };
    }
    case rpc.Api.GetTransactionStatus.FAILED: {
      const failedRes = response as rpc.Api.GetFailedTransactionResponse;
      return {
        status: "failed",
        rawStatus: response.status,
        txHash,
        // Preserve safe diagnostic metadata for debugging
        errorDetails: {
          resultXdr: failedRes.resultXdr,
          resultMetaXdr: failedRes.resultMetaXdr,
        },
      };
    }
    case rpc.Api.GetTransactionStatus.NOT_FOUND: {
      return {
        // Typically, NOT_FOUND while polling means it is still pending or not yet propagated
        status: "pending",
        rawStatus: response.status,
        txHash,
      };
    }
    default: {
      return {
        status: "unknown",
        rawStatus: ((response as Record<string, unknown>).status as string) || "unknown",
        txHash,
        errorDetails: "Unrecognized status in RPC response",
      };
    }
  }
}
