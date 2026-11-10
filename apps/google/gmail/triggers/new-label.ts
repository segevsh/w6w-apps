import type { TriggerDefinition } from "@w6w/types";
import { checkNewLabels, NEW_LABEL_OUTPUT, NEW_LABEL_SAMPLE } from "../lib/triggers.ts";

const newLabel: TriggerDefinition<Record<string, never>> = {
  key: "new-label",
  title: "New Label",
  description:
    "Runs when a new label is created in the mailbox. The run gets the label's id, name, type and visibility settings.",
  output: NEW_LABEL_OUTPUT,
  sample: NEW_LABEL_SAMPLE,
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return checkNewLabels(state, ctx);
  },
};

export default newLabel;
