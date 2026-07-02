import { PaymentParams } from "../types";

export type SimulationStatus = "success" | "warning" | "error";

export interface SimulationFinding {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  field?: string;
}

export interface SimulationResult {
  status: SimulationStatus;
  findings: SimulationFinding[];
  canProceed: boolean;
  estimatedFee?: bigint;
}

export interface SimulationOptions {
  /** Skip ZK proof generation during simulation (faster dry-run). Defaults to true. */
  skipProof?: boolean;
  /** Override the network for simulation purposes */
  network?: string;
}

export type SimulationInput = PaymentParams & { options?: SimulationOptions };
