import type { ActionDefinition } from "@w6w/types";
import { contactGroupResource, GoogleContactsClient } from "../lib/client.ts";

interface Input {
  resourceName: string;
  deleteContacts?: boolean;
}

/**
 * `contactGroups.delete` — delete a user contact group.
 * DELETE /v1/{resourceName=contactGroups/*}
 *
 * `deleteContacts` is the dangerous one: false (the default) removes the label
 * and leaves the people alone; true deletes every contact in the group.
 *
 * `idempotent: true` — the end state is the same however many times it runs.
 */
const deleteContactGroup: ActionDefinition<Input> = {
  key: "delete-contact-group",
  type: "perform",
  resource: "contact-group",
  title: "Delete Contact Group",
  description: "Delete a user contact group, optionally deleting the contacts inside it.",
  idempotent: true,
  params: [
    {
      key: "resourceName",
      label: "Resource Name",
      type: "string",
      required: true,
      placeholder: "contactGroups/1a2b3c",
      hint: "System groups cannot be deleted — only user-made ones.",
    },
    {
      key: "deleteContacts",
      label: "Also delete the contacts",
      type: "boolean",
      default: false,
      hint: "OFF removes only the group. ON deletes every contact in it. Cannot be undone.",
    },
  ],
  output: [
    { key: "resourceName", type: "string", label: "Deleted resource name" },
    { key: "success", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const client = new GoogleContactsClient(ctx);
    const name = contactGroupResource(input.resourceName);
    await client.request(`/${name}`, {
      method: "DELETE",
      // Sent only when true: `deleteContacts=false` is the server default, and
      // an explicit `false` in the URL reads like an intent that was considered.
      query: { deleteContacts: input.deleteContacts === true ? true : undefined },
    });
    return { resourceName: name, success: true };
  },
};

export default deleteContactGroup;
