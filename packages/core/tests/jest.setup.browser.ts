/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { TextEncoder, TextDecoder } from "util";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Polyfill Worker for web-worker / ffjavascript multi-threading initialization
if (typeof global.Worker === "undefined") {
  global.Worker = class MockWorker {
    public onmessage: ((this: Worker, ev: MessageEvent) => any) | null = null;
    public onerror: ((this: Worker, ev: ErrorEvent) => any) | null = null;

    constructor(stringUrl: string | URL, options?: WorkerOptions) {
      // Instance initialized inside JSDOM container
    }

    postMessage(message: any, transfer?: any[]): void {}
    terminate(): void {}
    addEventListener(): void {}
    removeEventListener(): void {}
    dispatchEvent(): boolean {
      return true;
    }
  } as any;
}
