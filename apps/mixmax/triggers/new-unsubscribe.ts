import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/unsubscribe-list.ts";

const trigger = pollFromListAction({
  key: "new-unsubscribe",
  title: "New Unsubscribe",
  description: "Fires when a contact unsubscribes from sequences.",
  action,
  input: () => ({ sort: "createdAt", sortAscending: false, limit: 100 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) =>
    String((item as { _id?: unknown; id?: unknown })._id ?? (item as { id?: unknown }).id),
  output: [{ key: "email", type: "string", label: "Unsubscribed email" }],
  sample: { _id: "unsubscribe-1", email: "person@example.test" },
  maxPages: 1,
});

export default trigger;
