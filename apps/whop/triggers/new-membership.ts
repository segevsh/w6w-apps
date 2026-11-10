import { pollFromListAction } from "../../_shared/poll/mod.ts";
import membershipList from "../actions/membership-list.ts";

export default pollFromListAction({
  key: "new-membership",
  title: "New Membership",
  description: "The run gets each newly created membership.",
  action: membershipList,
  input: () => ({ order: "created_at", direction: "desc", first: 100 }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (i) => String((i as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Membership ID" }],
  sample: { id: "sample-id" },
  maxPages: 1,
});
