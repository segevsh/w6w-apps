import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "label-added-to-card",
  title: "Label Added To Card",
  description:
    "Fires when a label is put on a card on the watched Trello board or list. The run gets the card and the label (in the action data).",
  match: (type) => type === "addLabelToCard",
  withData: true,
  sample: {
    type: "addLabelToCard",
  },
});
