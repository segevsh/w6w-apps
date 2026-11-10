import type { TriggerDefinition } from "@w6w/types";
import { checkNewDrafts, NEW_DRAFT_OUTPUT, NEW_DRAFT_SAMPLE } from "../lib/triggers.ts";

const newDraft: TriggerDefinition<Record<string, never>> = {
  key: "new-draft",
  title: "New Draft",
  description:
    "Runs when a new draft is saved in the mailbox. The run gets the draft's id and its message and thread ids; use Get Draft for the content.",
  output: NEW_DRAFT_OUTPUT,
  sample: NEW_DRAFT_SAMPLE,
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return checkNewDrafts(state, ctx);
  },
};

export default newDraft;
