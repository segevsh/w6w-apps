import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/voucher-list.ts";

export default pollFromListAction({
  key: "new-voucher",
  title: "New Voucher",
  description: "The run gets each newly created new voucher.",
  action,
  input: () => ({
    voucherType: "any",
    voucherStatus: "any",
    sort: "createdDate,DESC",
    page: 0,
    size: 100,
  }),
  items: (result) => (result as { content?: unknown[] }).content ?? [],
  idOf: (item) =>
    String(
      (item as { id?: unknown; jnid?: unknown }).id ?? (item as { jnid?: unknown }).jnid ?? "",
    ),
  output: [{ key: "id", type: "string", label: "New Voucher ID" }],
  sample: { id: "example" },
  maxPages: 1,
});
