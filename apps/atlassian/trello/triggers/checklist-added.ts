import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "checklist-added",
  title: "Checklist Added",
  description:
    "Fires when a checklist is added to a card on the watched Trello board or list. The run gets the card and the checklist (in the action data).",
  match: (type) => type === "addChecklistToCard",
  withData: true,
  sample: {
    type: "addChecklistToCard",
  },
});
