import type { ActionDefinition } from "@w6w/types";
import { displayOf, json, MixpanelClient } from "../lib/client.ts";

/**
 * `POST /engage` on the ingestion host — set, increment, append to or remove
 * properties on a **user profile**.
 *
 * ## This is the one route that needs the project token
 *
 * Measured 2026-08-18, `/engage` with a valid-shaped service-account Basic
 * credential *and* `project_id` still answers
 * `{"error":"$token, missing or empty","status":0}`. The token has to be inside
 * the payload, and no header substitutes for it.
 *
 * An Action may not touch a credential, so the token is injected by the auth
 * `sign` hook — the one hook allowed to hold one, which also receives the
 * request body. If the connection was created without a project token, this
 * action says so before making a call that cannot succeed.
 *
 * ## The operations are not interchangeable
 *
 *   - **`$set`** overwrites the named properties, leaving the rest alone.
 *   - **`$set_once`** writes only properties that are not already set — the
 *     right one for "first seen at", which must not move.
 *   - **`$add`** increments numbers. Sending the *new total* with `$set` and
 *     sending the *delta* with `$add` are both correct and produce different
 *     answers; mixing them up is the classic double-count.
 *   - **`$union`** adds to a list property without duplicating.
 *   - **`$append`** adds to a list and does duplicate.
 *   - **`$unset`** removes properties by name.
 *
 * `$set`, `$set_once`, `$union` and `$unset` are idempotent; `$add` and
 * `$append` are not — which is why the action declares itself idempotent only
 * for the safe set and refuses to pretend otherwise.
 *
 * Like `/track`, `/engage` answers `200` regardless, so `verbose=1` is always
 * sent to get `{"error":…,"status":0|1}` back instead of a bare `1`.
 */
const OPERATIONS = ["$set", "$set_once", "$add", "$union", "$append", "$unset"] as const;

const action: ActionDefinition = {
  key: "profile-update",
  type: "perform",
  resource: "profile",
  title: "Update user profiles",
  description:
    "Set, increment, append to or remove properties on user profiles. Needs the connection's " +
    "project token, which only /engage requires.",
  idempotent: false,
  params: [
    {
      key: "operation",
      label: "Operation",
      type: "select",
      required: true,
      default: "$set",
      options: [
        { value: "$set", label: "$set — overwrite these properties" },
        { value: "$set_once", label: "$set_once — only if not already set" },
        { value: "$add", label: "$add — increment numbers by a DELTA" },
        { value: "$union", label: "$union — add to a list, no duplicates" },
        { value: "$append", label: "$append — add to a list, duplicates allowed" },
        { value: "$unset", label: "$unset — remove properties by name" },
      ],
      hint: "`$set` takes the new value; `$add` takes the change. Confusing the two is the " +
        "classic double-count.",
    },
    {
      key: "distinctId",
      label: "Distinct ID",
      type: "string",
      default: "",
      hint: "The user to update. For several users at once, use Records instead.",
    },
    {
      key: "properties",
      label: "Properties",
      type: "json",
      default: "",
      hint: 'The operation\'s payload — `{"plan":"pro"}` for $set, `{"logins":1}` for $add, ' +
        'or `["plan","seats"]` for $unset.',
    },
    {
      key: "records",
      label: "Records",
      type: "json",
      default: "",
      advanced: true,
      hint: 'A whole batch, Mixpanel\'s own shape: `[{"$distinct_id":"u1","$set":{…}}]`. ' +
        "Overrides Distinct ID and Properties. Up to 2000 per call.",
    },
  ],
  output: [
    { key: "status", type: "number", label: "Status (1 = accepted)" },
    { key: "error", type: "string", label: "Error" },
    { key: "count", type: "number", label: "Records sent" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;

    // Fail here rather than at Mixpanel, where the message names a field the
    // caller never supplied.
    if (displayOf(ctx.connection).hasProjectToken === false) {
      throw new Error(
        "this connection has no project token, and Mixpanel's /engage endpoint takes its " +
          "credential in the payload rather than a header — reconnect with the project token " +
          "to write profiles",
      );
    }

    const operation = String(p.operation ?? "$set");
    if (!(OPERATIONS as readonly string[]).includes(operation)) {
      throw new Error(`\`operation\` must be one of ${OPERATIONS.join(", ")}`);
    }

    const explicit = json(p.records, "records");
    let records: Array<Record<string, unknown>>;
    if (Array.isArray(explicit)) {
      records = explicit as Array<Record<string, unknown>>;
    } else {
      const distinctId = String(p.distinctId ?? "").trim();
      if (!distinctId) throw new Error("`distinctId` is required (or give `records`)");
      const properties = json(p.properties, "properties");
      if (properties === undefined) {
        throw new Error("`properties` is required (or give `records`)");
      }
      if (operation === "$unset" && !Array.isArray(properties)) {
        throw new Error('`$unset` takes an ARRAY of property names, e.g. `["plan","seats"]`');
      }
      records = [{ $distinct_id: distinctId, [operation]: properties }];
    }
    if (records.length === 0) throw new Error("nothing to update");
    if (records.length > 2000) {
      throw new Error(
        `Mixpanel accepts at most 2000 profile records per call; got ${records.length}`,
      );
    }

    ctx.log("info", "updating Mixpanel profiles", { operation, count: records.length });

    // `verbose=1` always: without it /engage answers a bare `1` or `0` inside a
    // 200, and a workflow cannot tell success from a rejected payload.
    const body = await new MixpanelClient(ctx).request<{ status?: number; error?: string }>(
      "/engage",
      { plane: "ingest", method: "POST", query: { verbose: "1" }, body: records },
    );
    if (body?.status !== 1) {
      throw new Error(`Mixpanel rejected the profile update: ${body?.error ?? "unknown reason"}`);
    }
    return { ...body, count: records.length };
  },
};

export default action;
