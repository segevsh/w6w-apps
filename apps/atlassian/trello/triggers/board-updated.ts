import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "board-updated",
  title: "Board Updated",
  description:
    "Fires when the watched Trello board is renamed, closed, reopened or otherwise changed. The run gets the board, what it was before (in the action data) and who changed it.",
  match: (type) => type === "updateBoard",
  withData: true,
  sample: {
    type: "updateBoard",
    cardId: null,
    cardName: null,
    listId: null,
    listName: null,
  },
});
