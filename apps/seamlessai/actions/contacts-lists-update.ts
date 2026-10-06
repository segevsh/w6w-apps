import type { ActionDefinition } from "@w6w/types";
import { compact, need, SeamlessClient, toIdList } from "../lib/client.ts";

/** `POST /api/client/v2/contacts` — Update Contact Lists. */
interface Input {
  contactIds: unknown;
  listIds?: unknown;
  listAction?: string;
}

const contactsListsUpdate: ActionDefinition<Input> = {
  key: "contacts-lists-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact Lists",
  description: "Add researched contacts to lists, remove them, or replace their list membership.",
  idempotent: true,
  params: [
    {
      key: "contactIds",
      label: "Contact IDs",
      type: "json",
      required: true,
      hint: "Integer contact IDs from contacts-list.",
    },
    { key: "listIds", label: "List IDs", type: "json", hint: "Integer list IDs from list-list." },
    {
      key: "listAction",
      label: "List action",
      type: "select",
      options: [{ value: "add", label: "add" }, { value: "remove", label: "remove" }, {
        value: "replace",
        label: "replace",
      }],
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "data", type: "object", label: "contactIds, skippedContactIds, listIds, listAction" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request("POST", "/contacts", {
      body: compact({
        contactIds: need(toIdList(input.contactIds), "Contact IDs"),
        listIds: toIdList(input.listIds),
        listAction: input.listAction,
      }),
    });
  },
};

export default contactsListsUpdate;
