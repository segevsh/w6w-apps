import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "list-updated",
  title: "List Updated",
  description:
    "Fires when a list on the watched Trello board is renamed, archived, unarchived or otherwise changed. The run gets the list, what it was before (in the action data) and who changed it.",
  match: (type) => type === "updateList",
  withData: true,
  sample: {
    type: "updateList",
    cardId: null,
    cardName: null,
  },
});
