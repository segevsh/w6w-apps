import { eventFilter, listAction } from "../lib/rows.ts";

export default listAction({
  key: "extras-list",
  title: "List extras",
  resource: "extras",
  whereType: "ExtraWhereInput",
  fields:
    "id code fullPrice commission diceCommission total hasSeparateAccessBarcode product { id name } ticket { id }",
  filters: [eventFilter],
});
