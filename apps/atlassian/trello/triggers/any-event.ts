import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on any Trello action you list (for example createList or addMemberToBoard), or on every action on the watched board, list or card when the list is blank. The run gets the action type, the board, list and card it concerns, who did it and the action's data.",
  match: () => true,
  any: true,
  withData: true,
});
