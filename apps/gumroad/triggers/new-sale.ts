import { pollFromListAction } from "../../_shared/poll/mod.ts";
import saleList from "../actions/sale-list.ts";

export default pollFromListAction({
  key: "new-sale",
  title: "New Sale",
  description: "The run gets each newly completed Gumroad sale.",
  action: saleList,
  input: () => ({}),
  items: (result) => (result as { sales?: unknown[] }).sales ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Sale ID" },
    { key: "email", type: "string", label: "Buyer email" },
  ],
  sample: { id: "sale_123", email: "buyer@example.test" },
});
