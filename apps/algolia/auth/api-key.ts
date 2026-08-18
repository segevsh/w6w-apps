import type { AuthDefinition } from "@w6w/types";

/**
 * Application ID + API Key (`custom`) — Algolia authenticates with **two**
 * headers, not one, which is why this is `custom` rather than `apiKey`:
 *
 *   x-algolia-application-id: <appId>
 *   x-algolia-api-key: <apiKey>
 *
 * Both names come from the security schemes in Algolia's own OpenAPI document
 * (`appId` and `apiKey`), which declares them as two separate `apiKey`-in-header
 * schemes applied together.
 *
 * **The application id is also the hostname**, so unlike a pure credential it
 * has to be visible to actions: `afterConnect` publishes it to the Connection's
 * redacted `display`, and `lib/client.ts` builds `{appId}.algolia.net` from
 * there. It is not a secret — Algolia embeds it in front-end code — so it is a
 * plain string field.
 *
 * **Key permissions are ACL-scoped.** Algolia keys carry an ACL list
 * (`search`, `browse`, `addObject`, `deleteObject`, `settings`, `editSettings`,
 * `listIndexes`, `logs`…), and the spec records the required ACL on every
 * operation. A search-only key will 403 on any write, which is why the liveness
 * probe below is chosen the way it is.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "custom",
  displayName: "Application ID & API Key",
  description:
    "From Algolia → Settings → API Keys. The Admin key can do everything; a search-only key " +
    "can only search. Both values are sent as `x-algolia-application-id` and " +
    "`x-algolia-api-key` headers.",
  connectionLabel: "{{appId}}",
  fields: [
    {
      key: "appId",
      label: "Application ID",
      type: "string",
      required: true,
      placeholder: "ABC123XYZ",
      hint: "Not a secret — it is part of the API hostname and Algolia embeds it in front-end " +
        "code.",
      validation: { pattern: "^[A-Za-z0-9]+$" },
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Use a key whose ACLs cover what your workflows do — writes need `addObject` / " +
        "`deleteObject`, settings need `editSettings`.",
    },
  ],

  /** The only hook handed the credential. It stamps both headers and returns. */
  sign({ request, credential }) {
    const { appId, apiKey } = credential as { appId: string; apiKey: string };
    request.headers["x-algolia-application-id"] = appId;
    request.headers["x-algolia-api-key"] = apiKey;
    return request;
  },

  async test({ credential }, ctx) {
    const { appId, apiKey } = credential as { appId?: string; apiKey?: string };
    if (!appId) return { ok: false, message: "credential missing appId" };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    // `GET /1/keys/{key}` describes the key being used — it needs no ACL of its
    // own, so it works for a search-only key as well as an admin one, and it
    // returns the ACLs that key actually holds. Probing an index list instead
    // would need `listIndexes` and would report a perfectly good search key as
    // broken.
    const res = await ctx.fetch(
      `https://${appId}-dsn.algolia.net/1/keys/${encodeURIComponent(apiKey)}`,
      {
        headers: {
          "x-algolia-application-id": appId,
          "x-algolia-api-key": apiKey,
          accept: "application/json",
        },
      },
    );
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: `Algolia rejected the credential (${res.status})` };
    }
    if (res.status === 404) {
      return { ok: false, message: "no such application, or the key does not belong to it (404)" };
    }
    if (!res.ok) return { ok: false, message: `Algolia returned ${res.status}` };
    return { ok: true };
  },

  /**
   * Records the application id — which actions cannot build a URL without — and
   * the key's ACLs, so an operator can see what this connection may actually
   * do. Never records the key itself.
   */
  async afterConnect({ credential }, ctx) {
    const { appId, apiKey } = credential as { appId: string; apiKey: string };
    const res = await ctx.fetch(
      `https://${appId}-dsn.algolia.net/1/keys/${encodeURIComponent(apiKey)}`,
    );
    if (!res.ok) return { appId };
    const body = await res.json().catch(() => null) as {
      acl?: string[];
      description?: string;
      indexes?: string[];
    } | null;
    return {
      appId,
      acl: body?.acl,
      keyDescription: body?.description,
      indexes: body?.indexes,
    };
  },
};

export default apiKey;
