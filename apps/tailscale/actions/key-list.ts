import type { ActionDefinition } from "@w6w/types";
import { query, tailnetFrom, TailscaleClient } from "../lib/client.ts";

/**
 * `GET /api/v2/tailnet/{tailnet}/keys` — the credentials that can put a
 * machine, or a program, into the tailnet.
 *
 * ## Three different things share this list
 *
 * - **`auth`** — a machine auth key. Anything holding one can join the tailnet
 *   as a device, with whatever tags the key grants.
 * - **`api`** — a user's API access token, like the one this connection may be
 *   using. Expires in at most 90 days.
 * - **`client`** — an OAuth client, which does not expire and mints tokens on
 *   demand.
 *
 * Reviewing "our Tailscale credentials" means reading all three, and the
 * dangerous one is usually a reusable, preauthorized, non-expiring auth key
 * left over from a migration: it silently admits new machines.
 *
 * ## What you see depends on what you are
 *
 * Without `all=true`, a user's API token sees only *that user's* keys, an
 * OAuth-derived token sees the tailnet's OAuth clients, and a federated
 * identity sees federated identities. Three different answers to the same
 * call, and none of them says it is partial. This action asks for `all` by
 * default and reports what it asked for.
 *
 * ## Capabilities are the part worth reading
 *
 * An auth key's `capabilities.devices.create` says whether it is reusable,
 * whether devices it creates are preauthorized (bypassing device approval
 * entirely), whether they are ephemeral, and which tags they get. A reusable
 * preauthorized key is a standing invitation.
 */
const action: ActionDefinition = {
  key: "key-list",
  type: "search",
  resource: "key",
  title: "List keys",
  description:
    "Auth keys, API access tokens and OAuth clients in one list. Flags the combination worth " +
    "finding: a REUSABLE, PREAUTHORIZED key that never expires is a standing invitation into " +
    "the tailnet.",
  params: [
    {
      key: "all",
      label: "Every key in the tailnet",
      type: "boolean",
      default: true,
      hint: "Off, the answer depends on the calling credential's own kind and shows only its " +
        "own keys — without saying so.",
    },
    {
      key: "keyType",
      label: "Kind",
      type: "select",
      default: "",
      options: [
        { value: "", label: "All kinds" },
        { value: "auth", label: "Auth keys — let a machine join" },
        { value: "api", label: "API access tokens — a user's API credential" },
        { value: "client", label: "OAuth clients — non-expiring, scoped" },
      ],
    },
  ],
  output: [
    { key: "keys", type: "array", label: "The keys" },
    { key: "count", type: "number", label: "How many" },
    { key: "authKeys", type: "number", label: "Machine auth keys" },
    { key: "apiTokens", type: "number", label: "User API access tokens" },
    { key: "oauthClients", type: "number", label: "OAuth clients — these never expire" },
    { key: "expiringSoon", type: "array", label: "Expiring within 14 days" },
    { key: "reusablePreauthorized", type: "array", label: "Admit machines without approval" },
    { key: "neverExpires", type: "array", label: "Keys with no expiry at all" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const tailnet = tailnetFrom(ctx.connection);
    const all = p.all !== false;

    const body = await new TailscaleClient(ctx).request<{
      keys?: Array<{
        id?: string;
        keyType?: string;
        description?: string;
        created?: string;
        expires?: string;
        userId?: string;
        scopes?: string[];
        capabilities?: {
          devices?: {
            create?: {
              reusable?: boolean;
              ephemeral?: boolean;
              preauthorized?: boolean;
              tags?: string[];
            };
          };
        };
      }>;
    }>(`/tailnet/${encodeURIComponent(tailnet)}/keys`, { query: query({ all }) });

    const requested = String(p.keyType ?? "").trim();
    const list = (body?.keys ?? []).filter((key) => !requested || key?.keyType === requested);

    const label = (key: { id?: string; description?: string }) =>
      key?.description ? `${key.description} (${key.id})` : String(key?.id ?? "");

    const soon = Date.now() + 14 * 24 * 60 * 60 * 1000;
    const expiringSoon = list.filter((key) => {
      if (!key?.expires) return false;
      const at = Date.parse(key.expires);
      return Number.isFinite(at) && at < soon;
    });

    // Reusable + preauthorized means new machines join with no approval.
    const reusablePreauthorized = list.filter((key) => {
      const create = key?.capabilities?.devices?.create;
      return create?.reusable === true && create?.preauthorized === true;
    });
    if (reusablePreauthorized.length) {
      ctx.log(
        "warn",
        "some auth keys are both reusable and preauthorized — anything holding one can add " +
          "machines to the tailnet without device approval",
        { count: reusablePreauthorized.length },
      );
    }

    return {
      keys: list,
      count: list.length,
      authKeys: list.filter((key) => key?.keyType === "auth").length,
      apiTokens: list.filter((key) => key?.keyType === "api").length,
      oauthClients: list.filter((key) => key?.keyType === "client").length,
      expiringSoon: expiringSoon.map((key) => ({
        id: key?.id,
        description: key?.description,
        expires: key?.expires,
      })),
      reusablePreauthorized: reusablePreauthorized.map(label),
      neverExpires: list.filter((key) => !key?.expires).map(label),
    };
  },
};

export default action;
