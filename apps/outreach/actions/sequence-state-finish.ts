import { memberAction } from "../lib/factory.ts";

export default memberAction({
  key: "sequence-state-finish",
  title: "Finish Sequence State",
  noun: "Sequence State",
  type: "sequenceState",
  path: "sequenceStates",
  action: "finish",
  description:
    "Finishes a sequence state, removing the prospect from the sequence, by sequence state ID.",
});
