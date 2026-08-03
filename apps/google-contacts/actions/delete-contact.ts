import type { ActionDefinition } from "@w6w/types";
import { GoogleContactsClient, personResource } from "../lib/client.ts";

interface Input {
  resourceName: string;
}

/**
 * `people.deleteContact` — delete a contact.
 * DELETE /v1/{resourceName=people/*}:deleteContact
 *
 * Takes no query parameters and returns an empty body, so the action reports
 * the resource it removed rather than echoing nothing back.
 *
 * `idempotent: true` — the end state is the same however many times it runs.
 * (A retry after success answers 404, which the client surfaces as an error;
 * the contact is still gone.)
 */
const deleteContact: ActionDefinition<Input> = {
  key: "delete-contact",
  type: "perform",
  resource: "person",
  title: "Delete Contact",
  description: "Delete a contact from the authenticated user's address book.",
  idempotent: true,
  params: [
    {
      key: "resourceName",
      label: "Resource Name",
      type: "string",
      required: true,
      placeholder: "people/c1234567890",
      hint: "Only contacts can be deleted — a profile read as `people/me` cannot.",
    },
  ],
  output: [
    { key: "resourceName", type: "string", label: "Deleted resource name" },
    { key: "success", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const client = new GoogleContactsClient(ctx);
    const name = personResource(input.resourceName);
    await client.request(`/${name}:deleteContact`, { method: "DELETE" });
    return { resourceName: name, success: true };
  },
};

export default deleteContact;
