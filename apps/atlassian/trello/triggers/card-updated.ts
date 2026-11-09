import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "card-updated",
  title: "Card Updated",
  description:
    "Fires when a card on the watched Trello board or list is edited, such as its name, description, due date or archive state. The run gets the card and who changed it. A move between lists is the Card Moved trigger.",
  match: (type, data) => type === "updateCard" && data.listAfter === undefined,
});
