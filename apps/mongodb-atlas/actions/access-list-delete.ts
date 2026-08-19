import type { ActionDefinition } from "@w6w/types";
import { AtlasClient, projectId } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `DELETE /api/atlas/v2/groups/{groupId}/accessList/{entryValue}` — close an
 * address off.
 *
 * ## This one does take effect immediately, unlike revoking a user
 *
 * Removing an entry stops new connections from that address at once. Existing
 * connections are not necessarily torn down, but nothing new gets in — which
 * makes this, rather than `database-user-delete`, the first move when cutting
 * off an address.
 *
 * ## Removing the entry your own automation connects from is a real hazard
 *
 * The access list governs the *database*, not this API, so a workflow cannot
 * lock itself out of Atlas this way. It can absolutely lock out the
 * application it was tidying up for — and the symptom is a connection timeout
 * with no error naming an access list.
 *
 * ## The value goes in the path, and a CIDR block contains a slash
 *
 * `10.0.0.0/8` has to be percent-encoded or the path is a different path. This
 * encodes it; a hand-rolled URL usually does not, and the result is a 404 for
 * an entry that is plainly there.
 */
const action: ActionDefinition = {
  key: "access-list-delete",
  type: "perform",
  resource: "access-list",
  title: "Delete an IP access entry",
  description:
    "Stop an address reaching the project's clusters, effective for new connections at once. " +
    "The CIDR slash must be encoded into the path, which is why a hand-rolled call 404s.",
  idempotent: true,
  params: [
    PROJECT_PARAM,
    {
      key: "value",
      label: "Address or CIDR",
      type: "string",
      required: true,
      default: "",
      placeholder: "203.0.113.0/24",
      hint: "Exactly as it appears in `access-list-get`.",
    },
    {
      key: "confirmValue",
      label: "Type the address again",
      type: "string",
      required: true,
      default: "",
      hint: "Removing the wrong entry breaks an application's connections with a timeout that " +
        "names no cause.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Removed" },
    { key: "value", type: "string", label: "What was removed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = projectId(p.projectId);
    const value = String(p.value ?? "").trim();
    if (!value) throw new Error("`value` is required");
    if (String(p.confirmValue ?? "").trim() !== value) {
      throw new Error(
        `\`confirmValue\` must match exactly — got "${String(p.confirmValue ?? "").trim()}" for ` +
          `"${value}". Removing the wrong entry breaks connections with a timeout that names no ` +
          "cause",
      );
    }

    await new AtlasClient(ctx).request(
      // The slash in a CIDR block has to be encoded, or this is another path.
      `/api/atlas/v2/groups/${id}/accessList/${encodeURIComponent(value)}`,
      { method: "DELETE" },
    );

    ctx.log("warn", "removed an Atlas access-list entry", { value });

    return { deleted: true, value };
  },
};

export default action;
