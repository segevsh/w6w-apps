import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "card-member-added",
  title: "Card Member Added",
  description:
    "Fires when a member is added to a card on the watched Trello board or list. The run gets the card, who added them and the new member.",
  match: (type) => type === "addMemberToCard",
  withData: true,
  sample: {
    type: "addMemberToCard",
    targetMemberId: "5f0a1b2c3d4e5f6a7b8c9d11",
    targetMemberName: "Grace Hopper",
  },
});
