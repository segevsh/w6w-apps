import { pollFromListAction } from "../../_shared/poll/mod.ts";
import vendorList from "../actions/vendor-list.ts";

export default pollFromListAction({
  key: "new-vendor",
  title: "New Vendor",
  description: "The run gets each new vendor.",
  action: vendorList,
  input: () => ({ size: 100, sort: "createdAt", sortDir: "DESC" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Vendor ID" }],
  sample: { id: 1 },
  maxPages: 1,
});
