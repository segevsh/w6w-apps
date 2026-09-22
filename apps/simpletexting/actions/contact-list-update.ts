import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, SimpleTextingClient } from "../lib/client.ts";
import { listIdParam } from "../lib/params.ts";

/**
 * `PUT /api/contact-lists/{listId}` — "Update a List Name".
 *
 * Renames a list and answers `200` with `{id}`. Note the path parameter: this is
 * the one list endpoint the document spells `{listId}` rather than
 * `{listIdOrName}`, while its own description still says "the list ID or name"
 * and the sibling GET and DELETE both accept either. A name is therefore
 * accepted here too, and the param's hint says so — the narrower template is the
 * one place where the document and its own prose disagree about this resource.
 *
 * Renaming is why a workflow should keep the list's ID rather than a name:
 * every other list endpoint addresses by name, so a rename performed in the
 * dashboard breaks a workflow that stored the old one, while a stored ID
 * survives it.
 */
interface Input {
  listId: string;
  name: string;
}

const contactListUpdate: ActionDefinition<Input> = {
  key: "contact-list-update",
  type: "perform",
  resource: "contact-list",
  title: "Update Contact List Name",
  description: "Rename a contact list.",
  idempotent: true,
  params: [
    listIdParam,
    {
      key: "name",
      label: "New name",
      type: "string",
      required: true,
      placeholder: "My Newer List",
      validation: { maxLength: 41 },
      hint: 'The vendor\'s own limit: "A list name containing less than 42 characters".',
    },
  ],
  output: [
    { key: "id", type: "string", label: "List ID (hexadecimal)" },
  ],

  execute(input, ctx) {
    return new SimpleTextingClient(ctx).json(
      `/api/contact-lists/${encodePathSegment(input.listId)}`,
      { method: "PUT", body: { name: input.name } },
    );
  },
};

export default contactListUpdate;
