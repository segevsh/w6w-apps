import { memberAction } from "../lib/factory.ts";

export default memberAction({
  key: "sequence-state-pause",
  title: "Pause Sequence State",
  noun: "Sequence State",
  type: "sequenceState",
  path: "sequenceStates",
  action: "pause",
  description: "Pauses an active sequence state, by sequence state ID.",
});
