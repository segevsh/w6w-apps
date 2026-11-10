import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "label-updated",
  title: "Label Updated",
  description:
    "Fires when a label on the watched Trello board is renamed or recoloured. The run gets the board and the label (in the action data).",
  match: (type) => type === "updateLabel",
  withData: true,
  sample: {
    type: "updateLabel",
    cardId: null,
    cardName: null,
    listId: null,
    listName: null,
  },
});
