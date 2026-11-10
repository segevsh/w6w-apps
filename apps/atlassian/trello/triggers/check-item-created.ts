import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "check-item-created",
  title: "Check Item Created",
  description:
    "Fires when an item is added to a checklist on the watched Trello board or list. The run gets the card, the checklist and the item (in the action data).",
  match: (type) => type === "createCheckItem",
  withData: true,
  sample: {
    type: "createCheckItem",
  },
});
