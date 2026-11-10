import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/user-list.ts";

export default pollFromListAction({
  key: "new-user",
  title: "New User",
  description: "The run gets each newly created new user.",
  action,
  input: () => ({ since: "1970-01-01T00:00:00.000Z", page: 1, limit: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) =>
    String(
      (item as { id?: unknown; jnid?: unknown }).id ?? (item as { jnid?: unknown }).jnid ?? "",
    ),
  output: [{ key: "id", type: "string", label: "New User ID" }],
  sample: { id: "example" },
  maxPages: 1,
});
