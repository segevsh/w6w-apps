import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "check-item-state-updated",
  title: "Check Item State Updated",
  description:
    "Fires when a checklist item is ticked or unticked on the watched Trello board or list. The run gets the card, the item and its new state (in the action data).",
  match: (type) => type === "updateCheckItemStateOnCard",
  withData: true,
  sample: {
    type: "updateCheckItemStateOnCard",
  },
});
