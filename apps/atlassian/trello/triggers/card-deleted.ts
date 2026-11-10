import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "card-deleted",
  title: "Card Deleted",
  description:
    "Fires when a card is deleted from the watched Trello board or list. The run gets the deleted card's ID, its list and board, and who deleted it.",
  match: (type) => type === "deleteCard",
  withData: true,
  sample: {
    type: "deleteCard",
    cardName: null,
  },
});
