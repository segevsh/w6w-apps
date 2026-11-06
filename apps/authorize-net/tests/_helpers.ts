import type { HookContext, SignableRequest } from "@w6w/types";
import { signRequest } from "../auth/api-credentials.ts";
import type { Environment } from "../lib/client.ts";

export const CREDENTIAL = {
  apiLoginId: "TEST_LOGIN",
  transactionKey: "TEST_TRANSACTION_KEY",
  environment: "sandbox",
};
export const OK = {
  messages: { resultCode: "Ok", message: [{ code: "I00001", text: "Successful." }] },
};
export interface MockResponse {
  status?: number;
  body?: unknown;
}
export function mockCtx(
  responses: MockResponse[] = [{ body: OK }],
  environment: Environment = "sandbox",
  sign = true,
) {
  const calls: Array<SignableRequest & { unsignedBody: string }> = [];
  const queue = [...responses];
  const ctx: HookContext = {
    connection: {
      id: "test",
      app: "io.w6w.authorize-net",
      auth: "api-credentials",
      owner: "test",
      state: "connected",
      createdAt: "2026-11-05T00:00:00Z",
      display: { environment },
    },
    log() {},
    fetch: (url, init) => {
      const unsigned: SignableRequest = {
        url: String(url),
        method: init?.method ?? "GET",
        headers: Object.fromEntries(new Headers(init?.headers).entries()),
        body: init?.body as string,
      };
      const signed = sign ? signRequest(unsigned, { ...CREDENTIAL, environment }) : unsigned;
      calls.push({ ...signed, unsignedBody: unsigned.body as string });
      if (!queue.length) throw new Error("Unexpected fetch or retry");
      const response = queue.shift()!;
      return Promise.resolve(
        new Response(
          typeof response.body === "string" ? response.body : JSON.stringify(response.body ?? OK),
          { status: response.status ?? 200, headers: { "content-type": "application/json" } },
        ),
      );
    },
  };
  return { ctx, calls };
}

/** Deliberately reorder EVERY object while retaining array order. */
export function reverseKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).reverse().map(([key, item]) => [key, reverseKeys(item)]),
    );
  }
  return value;
}
