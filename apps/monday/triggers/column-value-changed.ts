import { webhookTrigger } from "../lib/triggers.ts";

/** Any column value changes on an item of the chosen board. */
const columnValueChanged = webhookTrigger({
  key: "column-value-changed",
  title: "Column Value Changed",
  description:
    "Fires when a column value changes on an item of a monday board. The run gets the item, the column and its new and previous values.",
  event: "change_column_value",
  deliveryTypes: ["update_column_value"],
  sample: {
    type: "update_column_value",
    boardId: "1771812698",
    itemId: "1771812728",
    itemName: "Launch checklist",
    groupId: "topics",
    columnId: "date4",
    columnTitle: "Date",
    columnType: "date",
    value: { date: "2026-11-10", icon: null, time: null },
    previousValue: null,
    userId: "9603417",
    triggerTime: "2026-11-10T09:15:03.429Z",
    subscriptionId: "73760484",
    triggerUuid: "645fc8d8709d35718f1ae00ceded91e9",
    columnValues: {},
  },
});

export default columnValueChanged;
