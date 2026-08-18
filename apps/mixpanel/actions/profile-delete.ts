import type { ActionDefinition } from "@w6w/types";
import { csv, displayOf, MixpanelClient } from "../lib/client.ts";

/**
 * `POST /engage` with `$delete` — remove user profiles.
 *
 * **This deletes the profile, not the events.** A user's events stay in the
 * project and keep appearing in reports; what goes is the profile record and
 * the properties on it. Anyone deleting for a GDPR erasure request needs
 * Mixpanel's separate deletion API for the event data too, and this action says
 * so rather than letting it be mistaken for a complete erasure.
 *
 * It carries a confirmation flag for the usual reason: an irreversible call
 * reached by a mis-set variable should not succeed on the strength of an id
 * alone. Deleting a profile that is already gone is not an error, so retrying
 * is safe.
 *
 * Like every `/engage` call it needs the connection's project token.
 */
const action: ActionDefinition = {
  key: "profile-delete",
  type: "perform",
  resource: "profile",
  title: "Delete user profiles",
  description:
    "Delete profile records. Their EVENTS remain in the project — this is not a GDPR erasure, " +
    "which needs Mixpanel's separate deletion API.",
  idempotent: true,
  params: [
    {
      key: "distinctIds",
      label: "Distinct IDs",
      type: "string",
      required: true,
      default: "",
      hint: "Comma-separated. Up to 2000 per call.",
    },
    {
      key: "confirm",
      label: "Yes, delete these profiles",
      type: "boolean",
      required: true,
      default: false,
      hint: "Irreversible. The users' events are NOT deleted by this.",
    },
  ],
  output: [
    { key: "status", type: "number", label: "Status (1 = accepted)" },
    { key: "count", type: "number", label: "Profiles deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    if (displayOf(ctx.connection).hasProjectToken === false) {
      throw new Error(
        "this connection has no project token, which Mixpanel's /engage endpoint requires in " +
          "the payload — reconnect with it to delete profiles",
      );
    }
    const distinctIds = csv(p.distinctIds);
    if (!distinctIds) throw new Error("`distinctIds` is required");
    if (p.confirm !== true) {
      throw new Error(
        `refusing to delete ${distinctIds.length} profile(s) without \`confirm\` — this cannot ` +
          "be undone",
      );
    }
    if (distinctIds.length > 2000) {
      throw new Error(`Mixpanel accepts at most 2000 records per call; got ${distinctIds.length}`);
    }

    ctx.log("warn", "deleting Mixpanel profiles", { count: distinctIds.length });
    const body = await new MixpanelClient(ctx).request<{ status?: number; error?: string }>(
      "/engage",
      {
        plane: "ingest",
        method: "POST",
        query: { verbose: "1" },
        body: distinctIds.map((id) => ({ $distinct_id: id, $delete: "" })),
      },
    );
    if (body?.status !== 1) {
      throw new Error(`Mixpanel rejected the deletion: ${body?.error ?? "unknown reason"}`);
    }
    return { ...body, count: distinctIds.length };
  },
};

export default action;
