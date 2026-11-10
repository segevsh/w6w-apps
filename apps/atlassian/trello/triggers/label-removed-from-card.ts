import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "label-removed-from-card",
  title: "Label Removed From Card",
  description:
    "Fires when a label is taken off a card on the watched Trello board or list. The run gets the card and the label (in the action data).",
  match: (type) => type === "removeLabelFromCard",
  withData: true,
  sample: {
    type: "removeLabelFromCard",
  },
});
