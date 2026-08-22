import type { ActionDefinition } from "@w6w/types";
import { compact, FivetranClient, json } from "../lib/client.ts";

/**
 * `POST /v1/connections/{id}/resync` — re-read **everything**, from the
 * beginning.
 *
 * ## This is the expensive one, and the cost is not obvious
 *
 * A historical re-sync discards the connection's position and reads the entire
 * source again. Fivetran bills by **monthly active rows** — rows touched in a
 * month — so re-syncing a table that has not changed still bills every row in
 * it. On a large connection that is a real, unbudgeted amount of money, and it
 * arrives on next month's invoice rather than as an error.
 *
 * It also takes hours to days, during which the connection's normal schedule is
 * displaced.
 *
 * There are good reasons to do it — a source's historical data was corrected, a
 * schema change needs backfilling, a sync was broken for long enough to have
 * gaps. All of them are decisions a person makes, so this action requires an
 * explicit acknowledgement rather than being one boolean away from
 * `connection-sync`.
 *
 * ## Scope it if the connector supports it
 *
 * `scope` re-syncs named tables within named schemas instead of everything,
 * which is usually what the reason actually calls for and costs proportionally
 * less. Fivetran supports it for connectors that offer table-level re-sync —
 * databases, mostly. An empty scope object is rejected with a `400` rather than
 * being treated as "everything", which is the right default.
 *
 * ## A running sync makes this fail
 *
 * Fivetran declines with `409 Conflict` rather than queueing, so a re-sync
 * fired at a busy connection is refused. The error says so.
 */
const action: ActionDefinition = {
  key: "connection-resync",
  type: "perform",
  resource: "connection",
  title: "Re-sync a connection (historical)",
  description:
    "Re-read the ENTIRE source from the beginning. Fivetran bills by monthly active rows, so " +
    "this re-bills every row — hours to days of work and real money on next month's invoice.",
  idempotent: false,
  params: [
    { key: "connectionId", label: "Connection ID", type: "string", required: true, default: "" },
    {
      key: "confirm",
      label: "I understand this re-reads and re-bills everything",
      type: "boolean",
      required: true,
      default: false,
      hint: "A full re-sync bills every row in the source again, takes hours to days, and " +
        "displaces the normal schedule. Scope it below if you only need part of it.",
    },
    {
      key: "scope",
      label: "Scope",
      type: "json",
      default: "",
      hint: 'Re-sync only named tables: {"schema_name": ["table_a", "table_b"]}. Costs ' +
        "proportionally less, and is usually what the reason actually calls for. Supported by " +
        "connectors that offer table-level re-sync, mostly databases.",
    },
  ],
  output: [
    { key: "queued", type: "boolean", label: "The re-sync was accepted" },
    { key: "scoped", type: "boolean", label: "Whether it was limited to named tables" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const connectionId = String(p.connectionId ?? "").trim();
    if (!connectionId) throw new Error("`connectionId` is required");
    if (p.confirm !== true) {
      throw new Error(
        "set `confirm` — a historical re-sync re-reads the entire source and Fivetran bills by " +
          "monthly active rows, so every row is billed again. Use `scope` to limit it, or " +
          "`connection-sync` for an ordinary incremental sync",
      );
    }

    const scope = json(p.scope, "scope") as Record<string, unknown> | undefined;
    if (scope && Object.keys(scope).length === 0) {
      // Fivetran answers 400; refusing here says why.
      throw new Error(
        "`scope` is empty — an empty scope is rejected rather than meaning everything. Remove it " +
          "to re-sync the whole connection, or name the schemas and tables",
      );
    }

    ctx.log("warn", "starting a Fivetran HISTORICAL re-sync — every row will be re-billed", {
      connectionId,
      scoped: Boolean(scope),
    });

    await new FivetranClient(ctx).request(
      `/v1/connections/${encodeURIComponent(connectionId)}/resync`,
      { method: "POST", body: compact({ scope }) },
    );
    return { queued: true, scoped: Boolean(scope) };
  },
};

export default action;
