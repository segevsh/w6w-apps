import type { ActionDefinition } from "@w6w/types";
import { AtlasClient, projectId } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `DELETE …/databaseUsers/{databaseName}/{username}` — revoke a database
 * credential.
 *
 * ## This takes effect on the next connection, not on the current ones
 *
 * Existing connections authenticated with this user are **not** closed.
 * Deleting the user of a running application stops it reconnecting; it does
 * not stop it working until something makes it reconnect — a deploy, a network
 * blip, a driver's own pool recycling. So a revocation that appears to have
 * had no effect has had its full effect, later.
 *
 * That also means this is not an incident-response tool on its own. Cutting
 * off an active attacker needs the IP access list (`access-list-delete`), which
 * does apply to new connections immediately, and ultimately a cluster-level
 * intervention.
 *
 * ## Both parts of the identity are in the path
 *
 * The authentication database and the username, in that order. Getting the
 * first wrong is a 404 that reads as "no such user" while the user is plainly
 * in the list.
 */
const action: ActionDefinition = {
  key: "database-user-delete",
  type: "perform",
  resource: "database-user",
  title: "Delete a database user",
  description:
    "Revoke a database credential. EXISTING CONNECTIONS ARE NOT CLOSED — this stops the next " +
    "authentication, so a running application keeps working until something makes it reconnect.",
  idempotent: true,
  params: [
    PROJECT_PARAM,
    {
      key: "username",
      label: "Username",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "databaseName",
      label: "Authentication Database",
      type: "string",
      default: "admin",
      hint: "Part of the identity. A wrong value here is a 404 that reads as 'no such user'.",
    },
    {
      key: "confirmUsername",
      label: "Type the username again",
      type: "string",
      required: true,
      default: "",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Removed" },
    { key: "username", type: "string", label: "What was removed" },
    { key: "databaseName", type: "string", label: "From which authentication database" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = projectId(p.projectId);
    const username = String(p.username ?? "").trim();
    const databaseName = String(p.databaseName ?? "admin").trim() || "admin";
    if (!username) throw new Error("`username` is required");
    if (String(p.confirmUsername ?? "").trim() !== username) {
      throw new Error(
        `\`confirmUsername\` must match the username exactly — got ` +
          `"${String(p.confirmUsername ?? "").trim()}" for "${username}". Revoking the wrong ` +
          "credential breaks an application at its next reconnection rather than immediately, " +
          "so the mistake surfaces later",
      );
    }

    await new AtlasClient(ctx).request(
      `/api/atlas/v2/groups/${id}/databaseUsers/${encodeURIComponent(databaseName)}/${
        encodeURIComponent(username)
      }`,
      { method: "DELETE" },
    );

    ctx.log(
      "warn",
      "deleted an Atlas database user — existing connections keep working until they reconnect",
      { username, databaseName },
    );

    return { deleted: true, username, databaseName };
  },
};

export default action;
