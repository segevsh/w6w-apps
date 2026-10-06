import { memberAction } from "../lib/factory.ts";

export default memberAction({
  key: "sequence-state-resume",
  title: "Resume Sequence State",
  noun: "Sequence State",
  type: "sequenceState",
  path: "sequenceStates",
  action: "resume",
  description: "Resumes a paused sequence state, by sequence state ID.",
});
