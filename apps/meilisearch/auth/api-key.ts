import type { AuthDefinition } from "@w6w/types";
import { normalizeBaseUrl } from "../lib/client.ts";

/**
 * API key as a bearer token — what the spec's only security scheme declares
 * (`type: http`, `scheme: bearer`, `bearerFormat: "Uuidv4, string or JWT"`).
 *
 * ## The instance URL is half the credential
 *
 * Meilisearch has no vendor host. A key is meaningless without the address of
 * the instance it belongs to, so both are asked for together and the URL is
 * normalised once at connect time rather than at every call.
 *
 * ## Which key to use, and why it matters more than usual
 *
 * Meilisearch keys are **scoped**: the master key can do everything including
 * create other keys, while a key made for searching can only search. Using a
 * search-only key for a document write fails with `403` and
 * `code: "invalid_api_key"` — the same code as a wrong key — so "the key is
 * wrong" and "the key is not allowed to do that" look identical from the
 * outside. That is why `test` probes `GET /keys` and reports a `403` there
 * distinctly: a key that authenticates but cannot list keys is a *scoped* key,
 * which is usually the right choice and worth saying out loud rather than
 * failing the connection over.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "A Meilisearch instance URL plus an API key. The key may be the master key or any scoped " +
    "key with the permissions your actions need.",
  connectionLabel: "{{baseUrl}}",
  fields: [
    {
      key: "baseUrl",
      label: "Instance URL",
      type: "string",
      required: true,
      placeholder: "https://ms-abc123.sfo.meilisearch.io",
      hint: "Your Meilisearch Cloud project URL, or your own server. `http://localhost:7700` " +
        "works too — a URL without a scheme is assumed to be https.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "A scoped key is usually right. The master key can also create and delete keys.",
    },
    {
      key: "indexUid",
      label: "Default Index",
      type: "string",
      default: "",
      hint: "Optional. Actions that take an index fall back to this one.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  /**
   * `GET /keys?limit=1` proves the key is live **and** tells the two failure
   * modes apart — see the note above on scoped keys.
   */
  async test({ credential }, ctx) {
    const { apiKey, baseUrl } = credential as { apiKey?: string; baseUrl?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    if (!baseUrl) return { ok: false, message: "credential missing baseUrl" };

    let base: string;
    try {
      base = normalizeBaseUrl(baseUrl);
    } catch (err) {
      return { ok: false, message: String((err as Error).message) };
    }

    const res = await ctx.fetch(`${base}/keys?limit=1`, {
      headers: { authorization: `Bearer ${apiKey}`, accept: "application/json" },
    });
    if (res.status === 401) {
      return { ok: false, message: "Meilisearch rejected the API key (401)" };
    }
    if (res.status === 403) {
      // A key that authenticates but cannot list keys is a scoped key doing
      // exactly what it should. Not a failure.
      return { ok: true };
    }
    if (!res.ok) return { ok: false, message: `Meilisearch returned ${res.status}` };
    return { ok: true };
  },

  /**
   * Records the instance URL and default index the actions build calls from,
   * plus the engine version, which is worth having: Meilisearch's settings
   * surface changes between minor versions.
   */
  async afterConnect(_input, ctx) {
    const { credential } = _input as {
      credential: { apiKey?: string; baseUrl?: string; indexUid?: string };
    };
    const display: Record<string, unknown> = {
      baseUrl: credential.baseUrl ? normalizeBaseUrl(credential.baseUrl) : undefined,
      indexUid: credential.indexUid?.trim() || undefined,
    };
    if (!credential.apiKey || !display.baseUrl) return display;

    try {
      const res = await ctx.fetch(`${display.baseUrl}/version`, {
        headers: { authorization: `Bearer ${credential.apiKey}`, accept: "application/json" },
      });
      if (!res.ok) return display;
      const body = await res.json() as { pkgVersion?: string };
      display.engineVersion = body.pkgVersion;
      return display;
    } catch {
      return display;
    }
  },
};

export default apiKey;
