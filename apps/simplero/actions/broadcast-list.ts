import { listAction } from "../lib/factory.ts";
import type { PageInput } from "../lib/params.ts";

interface Input extends PageInput {
  state?: "failed" | "draft" | "delivered" | "scheduling" | "waiting_delivery" | "queued";
  listId?: number;
}

export default listAction<Input>({
  key: "broadcast-list",
  resource: "broadcast",
  title: "List Broadcasts",
  description:
    "List email broadcasts (read-only), optionally by delivery state or recipient list. Each " +
    "record carries its sent, open, click, bounce and unsubscribe counts.",
  path: "/broadcasts",
  itemsLabel: "Broadcasts",
  params: [
    {
      key: "state",
      label: "State",
      type: "select",
      options: [
        { value: "draft", label: "Draft" },
        { value: "scheduling", label: "Scheduling" },
        { value: "waiting_delivery", label: "Waiting for delivery" },
        { value: "queued", label: "Queued" },
        { value: "delivered", label: "Delivered" },
        { value: "failed", label: "Failed" },
      ],
    },
    {
      key: "listId",
      label: "List ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Only broadcasts addressed to this email list.",
    },
  ],
  query: (i) => ({ state: i.state, list_id: i.listId }),
});
