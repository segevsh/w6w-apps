import type { AuthDefinition } from "@w6w/types";
import { type Environment, hostFor } from "../lib/client.ts";

/**
 * Plaid client credentials — injected into the **request body**, because Plaid
 * takes no `Authorization` header at all.
 *
 * Every Plaid call is a `POST` whose JSON body carries `client_id` and `secret`
 * beside the request's own arguments. Verified 2026-08-18: omitting them
 * answers `{"error_code":"INVALID_FIELD","error_message":"client_id must be a
 * properly formatted, non-empty string"}`.
 *
 * An Action may never touch a credential, so this hook does it. `sign` receives
 * the request **body** as well as its headers, runs network-less so it cannot
 * leak what it holds, and is the only place in an App allowed near a secret.
 * Actions build a credential-free body and never see the pair.
 *
 * ## Environments
 *
 * Sandbox and production are separate installations with **separate secrets** —
 * Plaid issues a different `secret` per environment against one `client_id`, so
 * a connection belongs to exactly one. Sandbox is also the only place where an
 * Item can be created without a browser (`sandbox-item-create`), which is what
 * makes a Plaid workflow testable at all.
 *
 * Plaid's third environment, `development`, no longer exists: verified
 * 2026-08-18, `development.plaid.com` fails DNS resolution rather than
 * answering. It is deliberately not offered.
 */
export function createPlaidAuth(environment: Environment): AuthDefinition {
  const isSandbox = environment === "sandbox";

  return {
    key: isSandbox ? "client-secret-sandbox" : "client-secret",
    type: "custom",
    displayName: isSandbox ? "Client Credentials (Sandbox)" : "Client Credentials (Production)",
    description: isSandbox
      ? "Plaid sandbox credentials. Secrets are per environment, and sandbox is the only place " +
        "an Item can be created without a browser."
      : "Plaid production credentials. The secret differs from the sandbox one even though the " +
        "client ID is the same.",
    connectionLabel: isSandbox ? "Plaid (sandbox)" : "Plaid (production)",
    fields: [
      {
        key: "clientId",
        label: "Client ID",
        type: "secret",
        required: true,
        row: "creds",
        hint: "Plaid Dashboard → Developers → Keys. The same for every environment.",
      },
      {
        key: "secret",
        label: "Secret",
        type: "secret",
        required: true,
        row: "creds",
        hint: `The ${environment} secret specifically — Plaid issues one per environment.`,
      },
    ],

    /**
     * Plaid has no token to exchange; the pasted values *are* the credential.
     * This hook exists to record the environment alongside them.
     */
    exchange({ fields }) {
      const { clientId, secret } = (fields ?? {}) as Record<string, string>;
      if (!clientId || !secret) throw new Error("Client ID and Secret are both required.");
      return { clientId, secret, environment };
    },

    /**
     * The credential goes in the BODY, not a header — so this hook parses the
     * outgoing JSON, adds the pair, and re-serialises it.
     */
    sign({ request, credential }) {
      const { clientId, secret } = credential as { clientId: string; secret: string };
      let body: Record<string, unknown> = {};
      if (request.body) {
        try {
          body = JSON.parse(request.body) as Record<string, unknown>;
        } catch {
          // A body that is not the JSON object Plaid expects is left alone —
          // Plaid will reject it, and mangling it here would hide why.
          return request;
        }
      }
      request.headers["content-type"] = "application/json";
      request.body = JSON.stringify({ client_id: clientId, secret, ...body });
      return request;
    },

    /**
     * `POST /institutions/get` with a tiny page — the cheapest call that needs
     * no Item and proves the credentials work in *this* environment. A
     * production secret used against sandbox fails here rather than later on a
     * user's data.
     */
    async test({ credential }, ctx) {
      const { clientId, secret } = credential as { clientId?: string; secret?: string };
      if (!clientId || !secret) return { ok: false, message: "credential missing clientId/secret" };

      const res = await ctx.fetch(`${hostFor(environment)}/institutions/get`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          secret,
          count: 1,
          offset: 0,
          country_codes: ["US"],
        }),
      });
      const text = await res.text().catch(() => "");
      if (!res.ok) {
        const body = (() => {
          try {
            return JSON.parse(text) as { error_code?: string; error_message?: string };
          } catch {
            return {} as { error_code?: string; error_message?: string };
          }
        })();
        if (body.error_code === "INVALID_API_KEYS") {
          return {
            ok: false,
            message:
              `Plaid rejected these credentials for the ${environment} environment — the secret ` +
              "differs per environment even though the client ID does not",
          };
        }
        return {
          ok: false,
          message: `Plaid returned ${res.status}: ${body.error_code ?? text.slice(0, 120)}`,
        };
      }
      return { ok: true, message: `connected to Plaid ${environment}` };
    },

    /** Records only the environment. Neither credential is display data. */
    afterConnect() {
      return { environment };
    },
  };
}

export default createPlaidAuth("production");
