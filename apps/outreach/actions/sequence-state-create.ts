import { createAction } from "../lib/factory.ts";

export default createAction({
  key: "sequence-state-create",
  title: "Add Prospect to Sequence",
  noun: "Sequence State",
  type: "sequenceState",
  path: "sequenceStates",
  description:
    "Enroll a prospect in a sequence by creating a sequence state. The prospect, the sequence and the mailbox the emails go out from are all required; the sequence's automation starts immediately.",
  attrParams: [],
  relParams: [
    { param: "prospectId", rel: "prospect", type: "prospect" },
    { param: "sequenceId", rel: "sequence", type: "sequence" },
    { param: "mailboxId", rel: "mailbox", type: "mailbox" },
  ],
  relFieldParams: [
    {
      key: "prospectId",
      label: "Prospect ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "sequenceId",
      label: "Sequence ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "mailboxId",
      label: "Mailbox ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "The mailbox of the user the sequence sends from.",
    },
  ],
});
