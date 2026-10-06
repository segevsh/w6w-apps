import type { AuthDefinition } from "@w6w/types";
import { API_BASE, errorMessage } from "../lib/client.ts";

/**
 * DocuMerge API token — `Authorization: Bearer <token>`.
 *
 * Verified 2026-10-06 against https://app.documerge.ai/api-docs/ (and its
 * `openapi.yaml`, whose only security scheme is `http: bearer`), plus live probes.
 * The token comes from the dashboard: profile menu > API Tokens.
 *
 * ## How a bad token answers
 *
 * Laravel Sanctum: a missing token AND a wrong one are both
 * `401 {"message":"Unauthenticated."}` — byte-identical, so this app cannot tell
 * "no token reached the request" from "token rejected" and says both in its message.
 * Classification is by that body, never by the status alone.
 *
 * ## The probe
 *
 * `GET /api/documents` — the first read in the reference; needs no id, returns the
 * caller's own documents (no key material) and has no side effects.
 */
export const PROBE_PATH = "/api/documents";

export interface DocuMergeCredential {
  apiToken: string;
}

export type TokenAnswer =
  | { kind: "accepted" }
  | { kind: "unauthenticated"; detail: string }
  | { kind: "rate-limited" }
  | { kind: "other"; status: number; detail: string };

export function classifyTokenAnswer(status: number, text: string): TokenAnswer {
  let parsed: Record<string, unknown> | null = null;
  try {
    const p = JSON.parse(text);
    if (p && typeof p === "object" && !Array.isArray(p)) parsed = p as Record<string, unknown>;
  } catch {
    // not JSON: fall through
  }
  if (status >= 200 && status < 300 && parsed && "data" in parsed) return { kind: "accepted" };
  const detail = errorMessage(text);
  if (parsed && /unauthenticated/i.test(String(parsed.message ?? ""))) {
    return { kind: "unauthenticated", detail };
  }
  if (status === 429) return { kind: "rate-limited" };
  return { kind: "other", status, detail };
}

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Token",
  description:
    "Create an API token in DocuMerge (profile menu > API Tokens) and paste it here. A token " +
    "acts as the user that created it.",
  connectionLabel: "DocuMerge",
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "DocuMerge dashboard > profile menu > API Tokens.",
    },
  ],

  sign({ request, credential }) {
    const cred = credential as Partial<DocuMergeCredential>;
    request.headers["authorization"] = `Bearer ${cred.apiToken ?? ""}`;
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<DocuMergeCredential>;
    const token = (cred?.apiToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
    });
    const answer = classifyTokenAnswer(res.status, await res.text().catch(() => ""));
    switch (answer.kind) {
      case "accepted":
        return { ok: true };
      case "unauthenticated":
        return {
          ok: false,
          message: 'DocuMerge answered "Unauthenticated." — the token is missing, revoked or ' +
            "mistyped. Create a new one under profile menu > API Tokens.",
        };
      case "rate-limited":
        return { ok: false, message: "DocuMerge rate-limited the check (429); try again shortly." };
      default:
        return {
          ok: false,
          message: `DocuMerge returned HTTP ${answer.status}${
            answer.detail ? `: ${answer.detail}` : ""
          } for GET ${PROBE_PATH}`,
        };
    }
  },
};

export default apiToken;
