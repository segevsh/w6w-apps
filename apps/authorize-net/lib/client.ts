import type { HookContext } from "@w6w/types";
import { orderedRequest } from "./ordered-json.ts";

export const ENDPOINTS = {
  sandbox: "https://apitest.authorize.net/xml/v1/request.api",
  production: "https://api.authorize.net/xml/v1/request.api",
} as const;
export type Environment = keyof typeof ENDPOINTS;

export function environmentOf(value: unknown): Environment {
  if (value === undefined || value === "") return "sandbox";
  if (value !== "sandbox" && value !== "production") {
    throw new Error("Authorize.Net: environment must be sandbox or production");
  }
  return value;
}

export interface ApiMessage {
  code?: string;
  text?: string;
}
export interface ApiResponse extends Record<string, unknown> {
  messages?: { resultCode?: string; message?: ApiMessage[] };
  transactionResponse?: {
    responseCode?: string;
    transId?: string;
    errors?: Array<{ errorCode?: string; errorText?: string }>;
  };
}

/** Codes only: vendor text can echo supplied payment data or authentication material. */
export class AuthorizeNetError extends Error {
  constructor(message: string, readonly codes: string[] = [], readonly transactionId?: string) {
    super(message);
    this.name = "AuthorizeNetError";
  }
}

export async function readResponse(res: Response): Promise<ApiResponse> {
  let body: ApiResponse;
  try {
    // The gateway can prefix JSON with a UTF-8 BOM, which JSON.parse does not accept.
    body = JSON.parse((await res.text()).replace(/^\uFEFF/, ""));
  } catch {
    throw new AuthorizeNetError(`Authorize.Net returned non-JSON (HTTP ${res.status})`);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AuthorizeNetError(`Authorize.Net returned an invalid response (HTTP ${res.status})`);
  }
  const messages = Array.isArray(body.messages?.message) ? body.messages.message : [];
  const codes = messages.map((message) => message.code).filter((code): code is string =>
    typeof code === "string"
  );
  const transaction = body.transactionResponse;
  if (transaction) {
    const txErrors = Array.isArray(transaction.errors) ? transaction.errors : [];
    const txCodes = txErrors.map((error) => error.errorCode).filter((code): code is string =>
      typeof code === "string"
    );
    const failureCodes = body.messages?.resultCode === "Error" ? [...codes, ...txCodes] : txCodes;
    if (["2", "3"].includes(String(transaction.responseCode)) || txErrors.length) {
      throw new AuthorizeNetError(
        `Authorize.Net transaction ${
          String(transaction.responseCode) === "2" ? "declined" : "failed"
        }${failureCodes.length ? ` (${failureCodes.join(", ")})` : ""}`,
        failureCodes,
        transaction.transId,
      );
    }
    // 4 = held for review, not a completed payment and not a retryable failure. Preserve it.
  }
  if (!res.ok || body.messages?.resultCode !== "Ok") {
    throw new AuthorizeNetError(
      `Authorize.Net request failed (HTTP ${res.status}${
        codes.length ? `; ${codes.join(", ")}` : ""
      })`,
      codes,
    );
  }
  return body;
}

export class AuthorizeNetClient {
  constructor(private ctx: HookContext) {}

  async request(name: string, input: Record<string, unknown>): Promise<ApiResponse> {
    if (Object.hasOwn(input, "merchantAuthentication")) {
      throw new Error("Authorize.Net: authentication must come from the connection");
    }
    const env = environmentOf(this.ctx.connection?.display?.environment);
    const response = await this.ctx.fetch(ENDPOINTS[env], {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: orderedRequest(name, input),
    });
    // One attempt only. refId is a correlation ID, NOT an idempotency key.
    return readResponse(response);
  }
}
