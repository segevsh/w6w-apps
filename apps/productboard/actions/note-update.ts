import type { ActionDefinition } from "@w6w/types";
import {
  asOptionalJson,
  compact,
  type DataResult,
  encodeId,
  ProductboardClient,
} from "../lib/client.ts";
import { noteIdParam } from "../lib/params.ts";

/**
 * `PATCH /v2/notes/{id}` — update a note.
 *
 * Same two-form body as `entity-update` — `fields` replaces, `patch` operates —
 * but the note document spells out which operation each field accepts, and the
 * list is narrower than it looks:
 *
 *  - `owner`: `set`, `clear`
 *  - `tags`: `set`, `clear`, `addItems`, `removeItems`
 *  - `archived`, `processed`, `name`: `set` only
 *  - `content` on a **textNote**: `set` only
 *  - `content` on a **conversationNote**: `set`, `addItems`, `removeItems`
 *
 * and two compatibility rules the API enforces: you may not combine `set`/`clear`
 * with `addItems`/`removeItems` on the same field, nor `set` with `clear`.
 * `addItems` + `removeItems` together on one field is allowed.
 *
 * Marking a note `processed: true` is how an automation clears the triage inbox
 * it read with `note-list`.
 *
 * **Idempotent.** `set`, `clear`, `addItems` and `removeItems` are all absolute:
 * replaying one lands on the same state.
 */
interface Input {
  noteId: string;
  fields?: unknown;
  patch?: unknown;
}

const noteUpdate: ActionDefinition<Input, DataResult> = {
  key: "note-update",
  type: "perform",
  resource: "note",
  title: "Update note",
  description:
    "Update a note by replacing field values or by applying set/clear/addItems/removeItems patch " +
    "operations. Setting `processed` is how a workflow clears the triage inbox.",
  idempotent: true,
  params: [
    noteIdParam,
    {
      key: "fields",
      label: "Fields (replace)",
      type: "json",
      placeholder: '{"processed": true, "owner": {"email": "jane.doe@example.com"}}',
      hint: "Replaces each named field wholesale. For tags, this REPLACES the whole list — use " +
        "the patch form to add or remove one.",
    },
    {
      key: "patch",
      label: "Patch operations",
      type: "json",
      placeholder: '[{"op": "addItems", "path": "tags", "value": [{"name": "q2"}]}]',
      hint:
        'Array of {op, path, value}, or {op: "clear", path}. addItems/removeItems work on tags ' +
        "and on a conversation note's content only. You cannot mix set/clear with " +
        "addItems/removeItems on the same field.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Updated note" }],

  async execute(input, ctx) {
    const body = compact({
      fields: asOptionalJson<Record<string, unknown>>(input.fields, "Fields"),
      patch: asOptionalJson<unknown[]>(input.patch, "Patch operations"),
    });
    if (body.fields === undefined && body.patch === undefined) {
      throw new Error("Provide Fields, Patch operations, or both — an empty update does nothing");
    }
    const data = await new ProductboardClient(ctx).data(
      `/notes/${encodeId(input.noteId)}`,
      { method: "PATCH", body: { data: body } },
    );
    return { data };
  },
};

export default noteUpdate;
