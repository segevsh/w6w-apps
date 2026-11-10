import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "label-created",
  title: "Label Created",
  description:
    "Fires when a label is created on the watched Trello board. The run gets the board and the label (in the action data).",
  match: (type) => type === "createLabel",
  withData: true,
  sample: {
    type: "createLabel",
    cardId: null,
    cardName: null,
    listId: null,
    listName: null,
  },
});
