import { listAction } from "../lib/factory.ts";
import type { PageInput } from "../lib/params.ts";

interface Input extends PageInput {
  listId?: number;
  tagId?: number;
}

export default listAction<Input>({
  key: "subscription-list",
  resource: "subscription",
  title: "List List Subscriptions",
  description:
    "List email-list subscriptions (which contact is on which list, and whether it is active " +
    "or unsubscribed), optionally for one list or one tag.",
  path: "/subscriptions",
  itemsLabel: "Subscriptions",
  params: [
    {
      key: "listId",
      label: "List ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Only subscriptions to this email list.",
    },
    {
      key: "tagId",
      label: "Tag ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Only subscriptions whose contact carries this tag.",
    },
  ],
  query: (i) => ({ list_id: i.listId, tag_id: i.tagId }),
});
