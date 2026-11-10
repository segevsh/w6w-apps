import { boundedList } from "../lib/triggers.ts";
import itemList from "../actions/item-list.ts";

export default boundedList({
  key: "new-item",
  title: "New Item",
  description: "The run gets each catalogue item newly created on the account.",
  action: itemList as never,
  paged: true,
  output: [{ key: "id", type: "string", label: "Item ID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }, { key: "amount", type: "number", label: "Amount (smallest unit)" }],
  sample: { id: "item_1", name: "Pro plan setup", amount: 50000 },
});
