import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "label-deleted",
  title: "Label Deleted",
  description:
    "Fires when a label on the watched Trello board is deleted. The run gets the board and the label (in the action data).",
  match: (type) => type === "deleteLabel",
  withData: true,
  sample: {
    type: "deleteLabel",
    cardId: null,
    cardName: null,
    listId: null,
    listName: null,
  },
});
