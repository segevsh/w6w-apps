import type { ActionDefinition } from "@w6w/types";
import { ConstantContactClient } from "../lib/client.ts";

interface Input {
  listId: string;
  name: string;
  description?: string;
  favorite?: boolean;
}

/**
 * `PUT /v3/contact_lists/{list_id}` — updates a list's metadata only. It takes
 * the same `ListInput` body as the create (`name`, `description`, `favorite`),
 * and `name` is required on the way in even when it is unchanged.
 *
 * Membership is not touched here. To move contacts between lists use Add
 * Contacts to Lists / Remove Contacts from Lists, which are asynchronous bulk
 * activities on a different path.
 *
 * `idempotent: true` — the same body always leaves the list in the same state.
 */
const updateContactList: ActionDefinition<Input> = {
  key: "update-contact-list",
  type: "perform",
  resource: "list",
  title: "Update Contact List",
  description:
    "Update a contact list's name, description or favourite flag. Does not change membership.",
  idempotent: true,
  params: [
    { key: "listId", label: "List ID", type: "string", required: true },
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      validation: { maxLength: 255 },
      hint: "Required by the API on every update, even when unchanged.",
    },
    { key: "description", label: "Description", type: "text" },
    { key: "favorite", label: "Favourite", type: "boolean" },
  ],
  output: [
    { key: "list_id", type: "string", label: "List ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    const client = new ConstantContactClient(ctx);
    const body: Record<string, unknown> = { name: input.name };
    if (input.description !== undefined) body.description = input.description;
    if (input.favorite !== undefined) body.favorite = input.favorite;
    return client.request(`/contact_lists/${encodeURIComponent(input.listId)}`, {
      method: "PUT",
      body,
    });
  },
};

export default updateContactList;
