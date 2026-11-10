import { webhookTrigger } from "../lib/triggers.ts";

/** An item is created on the chosen board. */
const itemCreated = webhookTrigger({
  key: "item-created",
  title: "Item Created",
  description:
    "Fires when an item is created on a monday board. The run gets the item id and name, its group, the creator and the initial column values.",
  event: "create_item",
  deliveryTypes: ["create_pulse"],
  sample: {
    type: "create_pulse",
    boardId: "1771812698",
    itemId: "1772099344",
    itemName: "Launch checklist",
    groupId: "topics",
    columnId: null,
    columnTitle: null,
    columnType: null,
    value: null,
    previousValue: null,
    userId: "9603417",
    triggerTime: "2026-11-10T09:07:28.210Z",
    subscriptionId: "73759690",
    triggerUuid: "b5ed2e17c530f43668de130142445cba",
    columnValues: {},
  },
});

export default itemCreated;
