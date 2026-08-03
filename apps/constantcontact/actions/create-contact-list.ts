import type { ActionDefinition } from "@w6w/types";
import { ConstantContactClient } from "../lib/client.ts";

interface Input {
  name: string;
  description?: string;
  favorite?: boolean;
}

/**
 * `POST /v3/contact_lists` — creates a list. `name` is the only required
 * field; the API answers `409 Conflict` if a list with that name already
 * exists, so this is a create, not an upsert.
 *
 * `idempotent: false` for exactly that reason — the retry does not repeat the
 * first call's outcome.
 */
const createContactList: ActionDefinition<Input> = {
  key: "create-contact-list",
  type: "perform",
  resource: "list",
  title: "Create Contact List",
  description: "Create a contact list. Fails with 409 if the name is already taken.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      validation: { maxLength: 255 },
      hint: "Must be unique within the account.",
    },
    { key: "description", label: "Description", type: "text" },
    {
      key: "favorite",
      label: "Favourite",
      type: "boolean",
      default: false,
      hint: "Pins the list in the Constant Contact UI.",
    },
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
    return client.request("/contact_lists", { method: "POST", body });
  },
};

export default createContactList;
