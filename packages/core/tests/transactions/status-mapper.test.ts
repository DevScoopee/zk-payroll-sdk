import { rpc } from "@stellar/stellar-sdk";
import { mapTransactionStatus } from "../../src/transactions/status-mapper";
import { NormalizedTransactionStatus } from "../../src/transactions/types";

describe("mapTransactionStatus", () => {
  it("should map a null/undefined response to unknown safely", () => {
    const result1 = mapTransactionStatus(null);
    expect(result1.status).toBe("unknown");
    expect(result1.errorDetails).toBe("Missing or null RPC response");

    const result2 = mapTransactionStatus(undefined);
    expect(result2.status).toBe("unknown");
    expect(result2.errorDetails).toBe("Missing or null RPC response");
  });

  it("should map a SUCCESS response to confirmed", () => {
    const mockResponse: rpc.Api.GetSuccessfulTransactionResponse = {
      status: rpc.Api.GetTransactionStatus.SUCCESS,
      ledger: 12345,
      createdAt: 1704067200,
      hash: "tx_hash_success_123",
      returnValue: undefined,
      oldestLedger: 1,
      oldestLedgerCloseTime: "2024-01-01T00:00:00Z",
      latestLedger: 12345,
      latestLedgerCloseTime: "2024-01-01T00:00:00Z",
      envelopeXdr: {} as never,
      resultXdr: {} as never,
      resultMetaXdr: {} as never,
    } as any;

    const result: NormalizedTransactionStatus = mapTransactionStatus(mockResponse);

    expect(result.status).toBe("confirmed");
    expect(result.rawStatus).toBe(rpc.Api.GetTransactionStatus.SUCCESS);
    expect(result.txHash).toBe("tx_hash_success_123");
    expect(result.ledger).toBe(12345);
    expect(result.createdAt).toBe(1704067200);
  });

  it("should map a FAILED response to failed and preserve safe metadata", () => {
    const mockResponse: rpc.Api.GetFailedTransactionResponse = {
      status: rpc.Api.GetTransactionStatus.FAILED,
      hash: "tx_hash_fail_456",
      resultXdr: "AAAA...",
      resultMetaXdr: "BBBB...",
    } as any;

    const result: NormalizedTransactionStatus = mapTransactionStatus(mockResponse);

    expect(result.status).toBe("failed");
    expect(result.rawStatus).toBe(rpc.Api.GetTransactionStatus.FAILED);
    expect(result.txHash).toBe("tx_hash_fail_456");
    expect(result.errorDetails).toBeDefined();
    expect(result.errorDetails.resultXdr).toBe("AAAA...");
    expect(result.errorDetails.resultMetaXdr).toBe("BBBB...");
  });

  it("should map a NOT_FOUND response to pending", () => {
    const mockResponse: rpc.Api.GetMissingTransactionResponse = {
      status: rpc.Api.GetTransactionStatus.NOT_FOUND,
      hash: "tx_hash_pending_789",
    } as any;

    const result: NormalizedTransactionStatus = mapTransactionStatus(mockResponse);

    expect(result.status).toBe("pending");
    expect(result.rawStatus).toBe(rpc.Api.GetTransactionStatus.NOT_FOUND);
    expect(result.txHash).toBe("tx_hash_pending_789");
  });

  it("should safely handle malformed or unrecognized responses", () => {
    const mockResponse = {
      status: "WEIRD_STATUS",
      hash: "malformed_hash",
    } as any;

    const result: NormalizedTransactionStatus = mapTransactionStatus(mockResponse);

    expect(result.status).toBe("unknown");
    expect(result.rawStatus).toBe("WEIRD_STATUS");
    expect(result.txHash).toBe("malformed_hash");
    expect(result.errorDetails).toBe("Unrecognized status in RPC response");
  });
});
