import { SnarkjsProofGenerator } from "../src/crypto/SnarkjsProofGenerator";
import { ProofGeneratorConfig } from "../src/crypto/IProofGenerator";
import { createHookLogger, LogEvent } from "../src/logging/SdkLogger";
import axios from "axios";

jest.mock("snarkjs", () => ({
  groth16: { fullProve: jest.fn() },
}));

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockConfig: ProofGeneratorConfig = {
  wasmUrl: "https://example.com/circuit.wasm",
  zkeyUrl: "https://example.com/circuit.zkey",
  artifactCacheTTL: 3600,
};

const mockWasm = new ArrayBuffer(100);
const mockZkey = new Uint8Array(200);

beforeEach(() => {
  jest.clearAllMocks();
  mockedAxios.get.mockImplementation((url: string) => {
    if (url.includes(".wasm")) {
      return Promise.resolve({ data: mockWasm });
    }
    if (url.includes(".zkey")) {
      return Promise.resolve({ data: mockZkey.buffer });
    }
    return Promise.reject(new Error("Unknown URL"));
  });
});

describe("SnarkjsProofGenerator — preloading (Issue #49)", () => {
  describe("getPreloadStatus()", () => {
    it("returns not-loaded state before any operation", () => {
      const gen = new SnarkjsProofGenerator(mockConfig);
      const status = gen.getPreloadStatus();

      expect(status.wasmLoaded).toBe(false);
      expect(status.zkeyLoaded).toBe(false);
      expect(status.completedAt).toBeUndefined();
    });
  });

  describe("preload()", () => {
    it("returns status with both artifacts loaded", async () => {
      const gen = new SnarkjsProofGenerator(mockConfig);
      const status = await gen.preload();

      expect(status.wasmLoaded).toBe(true);
      expect(status.zkeyLoaded).toBe(true);
      expect(typeof status.completedAt).toBe("string");
    });

    it("completedAt is a valid ISO timestamp", async () => {
      const gen = new SnarkjsProofGenerator(mockConfig);
      const status = await gen.preload();

      expect(() => new Date(status.completedAt!)).not.toThrow();
      expect(new Date(status.completedAt!).toISOString()).toBe(status.completedAt);
    });

    it("fetches both wasm and zkey during preload", async () => {
      const gen = new SnarkjsProofGenerator(mockConfig);
      await gen.preload();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        mockConfig.wasmUrl,
        expect.objectContaining({ responseType: "arraybuffer" })
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(
        mockConfig.zkeyUrl,
        expect.objectContaining({ responseType: "arraybuffer" })
      );
    });

    it("updates getPreloadStatus() after preload", async () => {
      const gen = new SnarkjsProofGenerator(mockConfig);
      await gen.preload();
      const status = gen.getPreloadStatus();

      expect(status.wasmLoaded).toBe(true);
      expect(status.zkeyLoaded).toBe(true);
    });

    it("reuses preloaded artifacts so generateProof does not re-fetch", async () => {
      const mockProof = {
        pi_a: ["1", "2", "1"],
        pi_b: [
          ["3", "4"],
          ["5", "6"],
          ["1", "1"],
        ],
        pi_c: ["7", "8", "1"],
        protocol: "groth16",
        curve: "bn128",
      };
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { groth16 } = require("snarkjs");
      groth16.fullProve.mockResolvedValue({
        proof: mockProof,
        publicSignals: ["123"],
      });

      const gen = new SnarkjsProofGenerator(mockConfig);
      await gen.preload();

      const fetchCallsAfterPreload = mockedAxios.get.mock.calls.length;

      await gen.generateProof({ recipient: "G1", amount: "100" });

      expect(mockedAxios.get.mock.calls.length).toBe(fetchCallsAfterPreload);
    });

    it("clearArtifactCache() resets preload status", async () => {
      const gen = new SnarkjsProofGenerator(mockConfig);
      await gen.preload();

      gen.clearArtifactCache();

      const status = gen.getPreloadStatus();
      expect(status.wasmLoaded).toBe(false);
      expect(status.zkeyLoaded).toBe(false);
      expect(status.completedAt).toBeUndefined();
    });

    it("re-preloading after cache clear fetches artifacts again", async () => {
      const gen = new SnarkjsProofGenerator(mockConfig);
      await gen.preload();
      gen.clearArtifactCache();
      await gen.preload();

      expect(mockedAxios.get).toHaveBeenCalledTimes(4); // 2 fetches × 2 preloads
    });
  });
});

describe("SnarkjsProofGenerator — logging integration (Issue #50)", () => {
  it("emits proof_generation_start and proof_generation_complete", async () => {
    const mockProof = {
      pi_a: ["1", "2", "1"],
      pi_b: [
        ["3", "4"],
        ["5", "6"],
        ["1", "1"],
      ],
      pi_c: ["7", "8", "1"],
      protocol: "groth16",
      curve: "bn128",
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { groth16 } = require("snarkjs");
    groth16.fullProve.mockResolvedValue({
      proof: mockProof,
      publicSignals: ["123"],
    });

    const entries: LogEvent[] = [];
    const logger = createHookLogger((e) => entries.push(e));
    const gen = new SnarkjsProofGenerator(mockConfig, undefined, logger);

    await gen.generateProof({ recipient: "G1", amount: "100" });

    const events = entries.map((e) => e.event);
    expect(events).toContain("proof_generation_start");
    expect(events).toContain("proof_generation_complete");
  });

  it("emits artifact_fetch_start and artifact_fetch_complete for wasm and zkey", async () => {
    const mockProof = {
      pi_a: ["1", "2", "1"],
      pi_b: [
        ["3", "4"],
        ["5", "6"],
        ["1", "1"],
      ],
      pi_c: ["7", "8", "1"],
      protocol: "groth16",
      curve: "bn128",
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { groth16 } = require("snarkjs");
    groth16.fullProve.mockResolvedValue({
      proof: mockProof,
      publicSignals: ["123"],
    });

    const entries: LogEvent[] = [];
    const logger = createHookLogger((e) => entries.push(e));
    const gen = new SnarkjsProofGenerator(mockConfig, undefined, logger);

    await gen.generateProof({ recipient: "G1", amount: "100" });

    const events = entries.map((e) => e.event);
    expect(events.filter((e) => e === "artifact_fetch_start")).toHaveLength(2);
    expect(events.filter((e) => e === "artifact_fetch_complete")).toHaveLength(2);
  });

  it("emits artifact_preload_start and artifact_preload_complete", async () => {
    const entries: LogEvent[] = [];
    const logger = createHookLogger((e) => entries.push(e));
    const gen = new SnarkjsProofGenerator(mockConfig, undefined, logger);

    await gen.preload();

    const events = entries.map((e) => e.event);
    expect(events).toContain("artifact_preload_start");
    expect(events).toContain("artifact_preload_complete");
  });

  it("does not include sensitive witness data in log context", async () => {
    const mockProof = {
      pi_a: ["1", "2", "1"],
      pi_b: [
        ["3", "4"],
        ["5", "6"],
        ["1", "1"],
      ],
      pi_c: ["7", "8", "1"],
      protocol: "groth16",
      curve: "bn128",
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { groth16 } = require("snarkjs");
    groth16.fullProve.mockResolvedValue({
      proof: mockProof,
      publicSignals: ["123"],
    });

    const entries: LogEvent[] = [];
    const logger = createHookLogger((e) => entries.push(e));
    const gen = new SnarkjsProofGenerator(mockConfig, undefined, logger);

    await gen.generateProof({ recipient: "GSECRET123", amount: "999999" });

    for (const entry of entries) {
      const ctx = JSON.stringify(entry.context ?? {});
      expect(ctx).not.toContain("GSECRET123");
      expect(ctx).not.toContain("999999");
    }
  });

  it("works without a logger (no errors thrown)", async () => {
    const mockProof = {
      pi_a: ["1", "2", "1"],
      pi_b: [
        ["3", "4"],
        ["5", "6"],
        ["1", "1"],
      ],
      pi_c: ["7", "8", "1"],
      protocol: "groth16",
      curve: "bn128",
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { groth16 } = require("snarkjs");
    groth16.fullProve.mockResolvedValue({
      proof: mockProof,
      publicSignals: ["123"],
    });

    const gen = new SnarkjsProofGenerator(mockConfig);
    await expect(gen.generateProof({ recipient: "G1", amount: "100" })).resolves.toBeDefined();
  });
});
