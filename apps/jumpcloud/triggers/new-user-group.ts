import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/user-group-list.ts";

export default pollFromListAction({
  key: "new-user-group",
  title: "New User Group",
  description: "The run gets each newly created new user group.",
  action,
  input: () => ({ sort: "-created", limit: 100, returnAll: false }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) =>
    String(
      (item as { id?: unknown; jnid?: unknown }).id ?? (item as { jnid?: unknown }).jnid ?? "",
    ),
  output: [{ key: "id", type: "string", label: "New User Group ID" }],
  sample: { id: "example" },
  maxPages: 1,
});
