import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, SimpleTextingClient } from "../lib/client.ts";
import { listIdOrNameParam } from "../lib/params.ts";

/**
 * `GET /api/contact-lists/{listIdOrName}` — "Get a List".
 *
 * One `List` by ID **or by name**. The response is the same row shape as a page
 * of `contact-list-list`, plus the four membership counts and the `keywords`
 * that route into the list.
 *
 * `description` is "present when list is created automatically by a keyword via
 * the dashboard, otherwise defaults to null" — per the document — which makes it
 * the field that distinguishes a keyword-managed list from one a workflow
 * created.
 */
interface Input {
  listIdOrName: string;
}

const contactListGet: ActionDefinition<Input> = {
  key: "contact-list-get",
  type: "read",
  resource: "contact-list",
  title: "Get Contact List",
  description: "Read one contact list by name or hexadecimal ID.",
  params: [listIdOrNameParam],
  output: [
    { key: "listId", type: "string", label: "List ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description (keyword-created lists)" },
    { key: "totalContactsCount", type: "number", label: "Contacts" },
    { key: "activeContactsCount", type: "number", label: "Active contacts" },
    { key: "invalidContactsCount", type: "number", label: "Invalid contacts" },
    { key: "unsubscribedContactsCount", type: "number", label: "Unsubscribed contacts" },
    { key: "keywords", type: "array", label: "Keywords routing into the list" },
    { key: "created", type: "string", label: "Created at (ISO 8601)" },
    { key: "updated", type: "string", label: "Updated at (ISO 8601)" },
  ],

  execute(input, ctx) {
    return new SimpleTextingClient(ctx).json(
      `/api/contact-lists/${encodePathSegment(input.listIdOrName)}`,
    );
  },
};

export default contactListGet;
