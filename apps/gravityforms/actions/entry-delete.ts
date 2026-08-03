import type { ActionDefinition } from "@w6w/types";
import { boolToInt, GravityFormsClient } from "../lib/client.ts";

interface Input {
  entryId: string | number;
  force?: boolean;
}

/**
 * `DELETE /gf/v2/entries/[ENTRY_ID]` — trash or permanently delete an entry.
 *
 * Two behaviours behind one route, chosen by `force`:
 *
 *   - default (`force=0`) — the entry moves to the trash, and the response is
 *     the entry object with `status` set to `"trash"`. Recoverable.
 *   - `force=1` — the entry is permanently deleted, and the response is
 *     `{ "deleted": true, "previous": { …the deleted entry… } }`.
 *
 * Documented error codes: `gf_entry_invalid_id`, `gf_cannot_delete`,
 * `gf_already_trashed`.
 *
 * Capability: `gravityforms_delete_entries`.
 */
const entryDelete: ActionDefinition<Input> = {
  key: "entry-delete",
  type: "perform",
  resource: "entry",
  title: "Delete Entry",
  description: "Move an entry to the trash, or permanently delete it with Force.",
  // Retrying leaves the same end state — the entry is gone either way. It does
  // not return the same RESPONSE: a repeat answers `gf_already_trashed` (or
  // `gf_entry_invalid_id` after a forced delete) rather than the entry body.
  idempotent: true,
  params: [
    { key: "entryId", label: "Entry ID", type: "string", required: true },
    {
      key: "force",
      label: "Force",
      type: "boolean",
      default: false,
      hint: "Permanently delete instead of moving to the trash. Not recoverable.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "True when permanently deleted (Force only)" },
    { key: "previous", type: "object", label: "The deleted entry (Force only)" },
    { key: "id", type: "string", label: "Entry ID (trash response)" },
    { key: "status", type: "string", label: "Entry status, `trash` (trash response)" },
  ],

  execute(input, ctx) {
    ctx.log("info", "deleting Gravity Forms entry", {
      entryId: input.entryId,
      force: input.force === true,
    });
    const client = GravityFormsClient.fromConnection(ctx);
    return client.request(`/entries/${encodeURIComponent(String(input.entryId))}`, {
      method: "DELETE",
      query: { force: boolToInt(input.force) },
    });
  },
};

export default entryDelete;
