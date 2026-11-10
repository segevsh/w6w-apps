import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/ad-account-list.ts";

export default pollFromListAction({
  key: "new-ad-account",
  title: "New Ad Account",
  description: "The run gets each newly created new ad account.",
  action,
  input: () => ({ sortOrder: "DESCENDING", pageSize: 100 }),
  items: (result) => (result as { elements?: unknown[] }).elements ?? [],
  idOf: (item) =>
    String(
      (item as { id?: unknown; jnid?: unknown }).id ?? (item as { jnid?: unknown }).jnid ?? "",
    ),
  output: [{ key: "id", type: "string", label: "New Ad Account ID" }],
  sample: { id: "example" },
  maxPages: 1,
});
