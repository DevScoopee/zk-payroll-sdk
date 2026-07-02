import { rpc, Contract, TransactionBuilder, Networks, BASE_FEE, xdr } from "@stellar/stellar-sdk";
import type { ISigner } from "../signer/types";
import { ContractExecutionError, ContractErrorCode, mapRpcError } from "../errors";
import { RunIdentifier } from "../core/run-identifier";

/** How long (ms) to wait between transaction status polls */
const POLL_INTERVAL_MS = 2_000;
/** Maximum number of polls before declaring a timeout */
const MAX_POLLS = 15;

/**
 * BaseContractWrapper — Adapters layer
 *
 * Encapsulates the boilerplate required for every Soroban contract call:
 *  1. Build a transaction
 *  2. Simulate to get the resource footprint
 *  3. Re-assemble with the authorisation entries returned by simulation
 *  4. Sign and submit
 *  5. Poll until final status, then return the result value
 *
 * Subclasses only need to call `this.invoke(method, args)` and handle
 * the typed return value — no RPC plumbing required.
 */
export interface InvokeOptions {
  /**
   * Optional idempotency key for transaction submission.
   * Duplicate keys replay the same in-flight/completed submission result.
   */
  idempotencyKey?: string;
}

export abstract class BaseContractWrapper {
  protected readonly contract: Contract;
  private readonly submissionIdempotency = new IdempotencyRegistry<xdr.ScVal>();

  constructor(
    protected readonly server: rpc.Server,
    protected readonly contractId: string
  ) {
    this.contract = new Contract(contractId);
  }

  /**
   * Invoke a contract method end-to-end.
   *
   * Generates a deterministic request ID from the method name when none
   * is provided, enabling correlation across submission and polling flows.
   * Pass an explicit `requestId` if you need to group operations under a
   * shared identifier (e.g., from `RunIdentifier.generateCorrelationId()`).
   *
   * @param method     - Name of the contract function to call
   * @param args       - XDR-encoded arguments (use `nativeToScVal` from stellar-sdk)
   * @param signer     - Keypair that signs the transaction
   * @param network    - Stellar network passphrase (defaults to testnet)
   * @param requestId  - Optional request ID for correlation tracing.
   *                     Auto-generated from `method` if omitted.
   * @returns          - The decoded XDR result value
   * @throws           - `ContractExecutionError` on any RPC or contract failure
   */
  protected async invoke(
    method: string,
    args: xdr.ScVal[],
    signer: Keypair,
    network: string = Networks.TESTNET,
    requestId?: string
  ): Promise<xdr.ScVal> {
    const reqId = requestId ?? RunIdentifier.generateRequestId(method);

    try {
      // ── 1. Load the source account ─────────────────────────────────────
      const pubKey = await signer.getPublicKey();
      const account = await withRetry(() => this.server.getAccount(pubKey), {
        attempts: 3,
        delayMs: 100,
      });

      // ── 2. Build the raw transaction ───────────────────────────────────
      const rawTx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: network,
      })
        .addOperation(this.contract.call(method, ...args))
        .setTimeout(30)
        .build();

      // ── 3. Simulate to obtain resource footprint + auth entries ────────
      const simResult = await withRetry(() => this.server.simulateTransaction(rawTx), {
        attempts: 3,
        delayMs: 100,
      });

      if (rpc.Api.isSimulationError(simResult)) {
        throw new ContractExecutionError(
          `Simulation failed for "${method}": ${simResult.error}`,
          ContractErrorCode.SIMULATION_FAILED,
          { requestId: reqId }
        );
      }

      // ── 4. Assemble: attach footprint and authorisation from simulation ─
      const preparedTx = rpc.assembleTransaction(rawTx, simResult).build();

      await signer.sign(preparedTx);

      // ── 5. Submit ──────────────────────────────────────────────────────
      const sendResult = await withRetry(() => this.server.sendTransaction(preparedTx), {
        attempts: 3,
        delayMs: 100,
      });

      if (sendResult.status === "ERROR") {
        throw new ContractExecutionError(
          `Transaction submission failed for "${method}": ${JSON.stringify(
            sendResult.errorResult
          )}`,
          ContractErrorCode.TRANSACTION_SUBMISSION_FAILED,
          { requestId: reqId }
        );
      }

      // ── 6. Poll for final status ───────────────────────────────────────
      return await this.pollForResult(sendResult.hash, method, reqId);
    } catch (err) {
      // Re-throw already-typed errors, map everything else
      if (err instanceof ContractExecutionError) throw err;
      throw mapRpcError(err, { requestId: reqId });
    }

    return this.submissionIdempotency.execute(
      `${this.contractId}:${method}:${idempotencyKey}`,
      runInvocation,
      { cacheErrors: false }
    );
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /**
   * Poll the RPC until the transaction reaches a terminal state.
   * Returns the XDR result value on success; throws on failure or timeout.
   */
  private async pollForResult(
    txHash: string,
    method: string,
    requestId: string
  ): Promise<xdr.ScVal> {
    for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
      await sleep(POLL_INTERVAL_MS);

      const statusResult = await withRetry(() => this.server.getTransaction(txHash), {
        attempts: 3,
        delayMs: 100,
      });

      if (statusResult.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        if (!statusResult.returnValue) {
          // Void return — return unit ScVal
          return xdr.ScVal.scvVoid();
        }
        return statusResult.returnValue;
      }

      if (statusResult.status === rpc.Api.GetTransactionStatus.FAILED) {
        throw new ContractExecutionError(
          `Contract reverted during "${method}": ${JSON.stringify(statusResult.resultMetaXdr)}`,
          ContractErrorCode.CONTRACT_REVERT,
          { requestId }
        );
      }

      // Status is NOT_FOUND or still pending — keep polling
    }

    throw new ContractExecutionError(
      `Transaction timed out after ${MAX_POLLS} polls for "${method}" (hash: ${txHash})`,
      ContractErrorCode.TRANSACTION_TIMEOUT,
      { requestId }
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
