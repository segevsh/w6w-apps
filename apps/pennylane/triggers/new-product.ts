import action from "../actions/list-products.ts";
import { recordFeed } from "../lib/triggers.ts";

export default recordFeed({
  key: "new-product",
  title: "New Product",
  description: "The run gets each newly created Pennylane product, newest first.",
  action,
  output: [
    { key: "id", type: "number", label: "Product ID" },
    { key: "label", type: "string", label: "Label" },
    { key: "reference", type: "string", label: "Reference" },
  ],
  sample: { id: 55, label: "Consulting day", reference: "CONSULT-1" },
});
