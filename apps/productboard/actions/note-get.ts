import type { ActionDefinition } from "@w6w/types";
import { type DataResult, encodeId, ProductboardClient, toList } from "../lib/client.ts";
import { fieldsParam, noteIdParam } from "../lib/params.ts";

/**
 * `GET /v2/notes/{id}` — one note.
 *
 * Four fields a v1 integration will look for and not find, per the vendor's
 * migration guide: `followers[]`, `comments[]`, `totalResults` and
 * `features[].importance`. Comments are still there, but only through
 * `POST /v2/notes/{id}/comments` for writing — v2 does not embed them in the
 * note.
 *
 * Personal data in the response can come back as the literal string
 * `"[redacted]"` rather than being omitted: the vendor's `ObfuscatedValue`
 * schema is an enum of exactly that one value, used *"to hide personally
 * identifiable information in cases the request doesn't have the required
 * `members:pii:read` OAuth2 scope"*. A field reading `[redacted]` is a scope
 * problem, not the customer's actual email address.
 */
interface Input {
  noteId: string;
  fields?: string;
}

const noteGet: ActionDefinition<Input, DataResult> = {
  key: "note-get",
  type: "read",
  resource: "note",
  title: "Get note",
  description:
    "Retrieve one customer feedback note by ID. Personal fields read `[redacted]` when the token " +
    "lacks the members:pii:read scope.",
  params: [
    noteIdParam,
    {
      ...fieldsParam,
      hint: fieldsParam.hint + " Spelled `fields` on this endpoint, not `fields[]`.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Note" }],

  async execute(input, ctx) {
    const data = await new ProductboardClient(ctx).data(
      `/notes/${encodeId(input.noteId)}`,
      { query: { fields: toList(input.fields) } },
    );
    return { data };
  },
};

export default noteGet;
