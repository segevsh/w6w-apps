import { pollFromListAction } from "../../_shared/poll/mod.ts";
import addressList from "../actions/address-list.ts";

export default pollFromListAction({
  key: "new-address",
  title: "New Address",
  description: "The run gets each newly saved address.",
  action: addressList,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Address ID" }],
  sample: { id: "adr_123" },
  maxPages: 1,
});
