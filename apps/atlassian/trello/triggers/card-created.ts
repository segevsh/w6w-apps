import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "card-created",
  title: "Card Created",
  description:
    "Fires when a card is created on the watched Trello board or list. The run gets the card, its list and board, and who created it.",
  match: (type) => type === "createCard",
});
