import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "card-moved",
  title: "Card Moved",
  description:
    "Fires when a card moves to another list on the watched Trello board. The run gets the card, the list it left and the list it entered.",
  match: (type, data) =>
    type === "updateCard" && data.listBefore !== undefined && data.listAfter !== undefined,
});
