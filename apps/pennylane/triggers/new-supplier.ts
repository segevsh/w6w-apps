import action from "../actions/list-suppliers.ts";
import { recordFeed } from "../lib/triggers.ts";

export default recordFeed({
  key: "new-supplier",
  title: "New Supplier",
  description: "The run gets each newly created Pennylane supplier, newest first.",
  action,
  output: [
    { key: "id", type: "number", label: "Supplier ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: 204, name: "Papeterie Martin" },
});
