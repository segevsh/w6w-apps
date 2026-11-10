import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "list-created",
  title: "List Created",
  description:
    "Fires when a list is created on the watched Trello board. The run gets the list, the board and who created it.",
  match: (type) => type === "createList",
  withData: true,
  sample: {
    type: "createList",
    cardId: null,
    cardName: null,
    listName: "Doing",
  },
});
