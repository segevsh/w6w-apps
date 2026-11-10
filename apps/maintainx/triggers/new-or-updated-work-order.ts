import { workOrderFeed } from "../lib/triggers.ts";

export default workOrderFeed({
  key: "new-or-updated-work-order",
  title: "New or Updated Work Order",
  description:
    "The run gets each work order that was created or edited, with its new status and timestamps.",
  sort: "-updatedAt",
  idOf: (item) => {
    const w = item as { id?: unknown; updatedAt?: unknown };
    return `${String(w.id ?? "")}:${String(w.updatedAt ?? "")}`;
  },
});
