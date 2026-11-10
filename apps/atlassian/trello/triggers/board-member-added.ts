import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "board-member-added",
  title: "Board Member Added",
  description:
    "Fires when a member is added to the watched Trello board. The run gets the board, who added them and the new member.",
  match: (type) => type === "addMemberToBoard",
  withData: true,
  sample: {
    type: "addMemberToBoard",
    cardId: null,
    cardName: null,
    listId: null,
    listName: null,
    targetMemberId: "5f0a1b2c3d4e5f6a7b8c9d11",
    targetMemberName: "Grace Hopper",
  },
});
