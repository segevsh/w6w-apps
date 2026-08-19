import type { AuthDefinition } from "@w6w/types";
import { API_HOST, describeCloudError } from "../lib/client.ts";

/**
 * An organisation API key — the control plane.
 *
 * ## Key ID and key secret, sent as HTTP Basic
 *
 * ClickHouse Cloud issues a pair. The **secret is shown once**, at creation,
 * and cannot be retrieved afterwards; a lost secret means a new key. They are
 * sent as ordinary HTTP Basic — the id as the username, the secret as the
 * password — which is unusual only in that the docs call them a key rather than
 * a username and password.
 *
 * ## A key belongs to exactly one organisation
 *
 * Which is why the organisation is discovered at connect time and recorded,
 * rather than asked for on every action. `GET /v1/organizations` returns the
 * one it can see.
 *
 * ## The key's role decides what fails, and it fails late
 *
 * A key carries a role — developer, admin, or a custom one. A **read-only key
 * authenticates perfectly and succeeds on every list**, then fails with 403 on
 * the first change. Nothing at connect time distinguishes it, so this records
 * the roles it can see and the failure at least has something to point at.
 *
 * ## This credential cannot run SQL
 *
 * It reaches `api.clickhouse.cloud` and nothing else. Querying a service needs
 * that service's own database user and password — a separate connection, using
 * the `service` auth method.
 */
interface ApiKeyCredential {
  keyId: string;
  keySecret: string;
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "Organization API Key",
  description:
    "A ClickHouse Cloud key ID and secret, for managing services. This credential CANNOT run " +
    "SQL — querying a service needs its own database user, which is the `service` auth method.",
  connectionLabel: "{{organizationName}}",
  fields: [
    {
      key: "keyId",
      label: "Key ID",
      type: "secret",
      required: true,
      row: "key",
      hint: "Console → Organization → API keys. Sent as the Basic username.",
    },
    {
      key: "keySecret",
      label: "Key Secret",
      type: "secret",
      required: true,
      row: "key",
      hint: "Shown ONCE, at creation. A read-only key connects successfully and fails on the " +
        "first change with a 403.",
    },
  ],

  sign({ request, credential }) {
    const { keyId, keySecret } = credential as ApiKeyCredential;
    request.headers["authorization"] = `Basic ${btoa(`${keyId}:${keySecret}`)}`;
    return request;
  },

  /** `GET /v1/organizations` — the smallest call that proves the key. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<ApiKeyCredential> | undefined;
    if (!cred?.keyId || !cred?.keySecret) {
      return { ok: false, message: "credential missing the key ID or the key secret" };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${API_HOST}/v1/organizations`, {
        headers: {
          authorization: `Basic ${btoa(`${cred.keyId}:${cred.keySecret}`)}`,
          accept: "application/json",
        },
      });
    } catch (err) {
      return { ok: false, message: `could not reach ClickHouse Cloud: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");
    if (!res.ok) return { ok: false, message: describeCloudError(res.status, text) };

    interface OrgList {
      result?: Array<{ id?: string; name?: string }>;
    }
    let body: OrgList | null = null;
    try {
      body = JSON.parse(text) as OrgList;
    } catch {
      return { ok: false, message: "ClickHouse Cloud did not return JSON" };
    }

    const orgs = body?.result ?? [];
    if (!orgs.length) {
      return {
        ok: false,
        message: "the key works and can see no organisation, which should not happen — a key is " +
          "created inside one. Check it has not been revoked at the organisation level",
      };
    }
    return { ok: true, message: `connected to ${orgs[0]?.name ?? "an organisation"}` };
  },

  /** Record the organisation, because every control-plane path begins with it. */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<ApiKeyCredential>;
    if (!cred?.keyId || !cred?.keySecret) return {};
    try {
      const res = await ctx.fetch(`${API_HOST}/v1/organizations`, {
        headers: {
          authorization: `Basic ${btoa(`${cred.keyId}:${cred.keySecret}`)}`,
          accept: "application/json",
        },
      });
      if (!res.ok) {
        await res.body?.cancel();
        return {};
      }
      const body = await res.json().catch(() => null) as
        | { result?: Array<{ id?: string; name?: string }> }
        | null;
      const org = (body?.result ?? [])[0];
      return {
        organizationId: org?.id,
        organizationName: org?.name,
        plane: "control",
      };
    } catch {
      return {};
    }
  },
};

export default apiKey;
