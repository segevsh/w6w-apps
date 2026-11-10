import { workOrderFeed } from "../lib/triggers.ts";

export default workOrderFeed({
  key: "new-work-order",
  title: "New Work Order",
  description:
    "The run gets each newly created work order: id, title, status, priority, timestamps.",
  sort: "-createdAt",
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
});
