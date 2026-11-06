import type { AuthDefinition, SignableRequest } from "@w6w/types";
import { ENDPOINTS, environmentOf, readResponse } from "../lib/client.ts";
import { asObject, orderedRequest } from "../lib/ordered-json.ts";

interface Credential {
  apiLoginId: string;
  transactionKey: string;
  environment?: string;
}
function credentials(value: unknown): Credential {
  const input = value as Partial<Credential> | null;
  if (
    typeof input?.apiLoginId !== "string" || !input.apiLoginId.trim() ||
    typeof input?.transactionKey !== "string" || !input.transactionKey.trim()
  ) {
    throw new Error("Authorize.Net: API Login ID and Transaction Key are required");
  }
  return {
    apiLoginId: input.apiLoginId.trim(),
    transactionKey: input.transactionKey.trim(),
    environment: environmentOf(input.environment),
  };
}

/** Rebuild AFTER injecting auth: assigning merchantAuthentication to the old object appends it. */
export function signRequest(request: SignableRequest, value: unknown): SignableRequest {
  const cred = credentials(value);
  const endpoint = ENDPOINTS[environmentOf(cred.environment)];
  if (request.url !== endpoint || request.method.toUpperCase() !== "POST") {
    throw new Error("Authorize.Net: request endpoint does not match the connection environment");
  }
  const root = asObject(
    typeof request.body === "string"
      ? request.body
      : request.body instanceof Uint8Array
      ? new TextDecoder().decode(request.body)
      : undefined,
    "request",
  );
  const names = Object.keys(root);
  if (names.length !== 1) throw new Error("Authorize.Net: expected exactly one request envelope");
  const name = names[0];
  const body = asObject(root[name], name);
  // Discard any caller-provided auth before canonicalizing. Connection credentials always win.
  const { merchantAuthentication: _ignored, ...fields } = body;
  return {
    ...request,
    headers: { ...request.headers, "content-type": "application/json", accept: "application/json" },
    body: orderedRequest(name, {
      merchantAuthentication: { name: cred.apiLoginId, transactionKey: cred.transactionKey },
      ...fields,
    }),
  };
}

const apiCredentials: AuthDefinition = {
  key: "api-credentials",
  type: "custom",
  displayName: "API Login ID and Transaction Key",
  description:
    "From Account → Settings → API Credentials & Keys. Sandbox and production use separate accounts and credentials.",
  connectionLabel: "Authorize.Net ({{environment}})",
  fields: [
    { key: "apiLoginId", label: "API Login ID", type: "secret", required: true },
    { key: "transactionKey", label: "Transaction Key", type: "secret", required: true },
    {
      key: "environment",
      label: "Environment",
      type: "select",
      required: true,
      default: "sandbox",
      options: [{ value: "sandbox", label: "Sandbox" }, {
        value: "production",
        label: "Production",
      }],
    },
  ],
  sign({ request, credential }) {
    return signRequest(request, credential);
  },
  async test({ credential }, ctx) {
    try {
      const cred = credentials(credential);
      const request = signRequest({
        url: ENDPOINTS[environmentOf(cred.environment)],
        method: "POST",
        headers: {},
        body: JSON.stringify({ authenticateTestRequest: {} }),
      }, cred);
      await readResponse(
        await ctx.fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body as string,
        }),
      );
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error
          ? error.message
          : "Authorize.Net authentication test failed",
      };
    }
  },
  afterConnect({ credential }) {
    return { environment: environmentOf((credential as Credential).environment) };
  },
};
export default apiCredentials;
