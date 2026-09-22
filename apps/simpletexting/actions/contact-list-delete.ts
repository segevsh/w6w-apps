import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, SimpleTextingClient } from "../lib/client.ts";
import { listIdOrNameParam } from "../lib/params.ts";

/**
 * `DELETE /api/contact-lists/{listIdOrName}` — "Delete a List".
 *
 * Answers `204` with no body: "Success. List was deleted". Addressed by name or
 * by ID, like the GET.
 *
 * Deleting a list is a membership change for every contact on it and nothing
 * else — the document describes no cascade, and no endpoint in this surface
 * reports one, so nothing here claims a contact is deleted along with it.
 *
 * Idempotent in the sense the runtime cares about: the end state after one call
 * and after five is the same list, gone. The document lists only `204` for this
 * path, so a repeat is not documented; a delete is worth retrying because the
 * list still existing is the failure.
 */
interface Input {
  listIdOrName: string;
}

const contactListDelete: ActionDefinition<Input> = {
  key: "contact-list-delete",
  type: "perform",
  resource: "contact-list",
  title: "Delete Contact List",
  description: "Delete one contact list by name or ID.",
  idempotent: true,
  params: [listIdOrNameParam],
  output: [
    { key: "listIdOrName", type: "string", label: "List deleted" },
    { key: "status", type: "number", label: "HTTP status — 204 on success" },
  ],

  async execute(input, ctx) {
    const status = await new SimpleTextingClient(ctx).status(
      `/api/contact-lists/${encodePathSegment(input.listIdOrName)}`,
      { method: "DELETE" },
    );
    ctx.log("info", "deleted a SimpleTexting contact list", { status });
    return { listIdOrName: input.listIdOrName, status };
  },
};

export default contactListDelete;
