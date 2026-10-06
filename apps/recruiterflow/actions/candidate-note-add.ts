import type { ActionDefinition } from "@w6w/types";
import { asObject, call, compact, toInt } from "../lib/client.ts";

interface Input {
  id?: unknown;
  value?: unknown;
  createdBy?: unknown;
}

const candidateNoteAdd: ActionDefinition<Input> = {
  key: "candidate-note-add",
  type: "perform",
  title: "Add Candidate Note",
  description: "Add a note to a candidate.",
  idempotent: false,
  params: [
    { key: "id", label: "Candidate ID", type: "number", required: true },
    { key: "value", label: "Note", type: "text", required: true },
    { key: "createdBy", label: "Author (user ID)", type: "number" },
  ],
  output: [{ key: "RESULT", type: "string", label: "Result" }, {
    key: "data",
    type: "object",
    label: "Response data",
  }],

  async execute(input, ctx) {
    const body = compact({
      "id": toInt(input.id, "Candidate ID"),
      "value": input.value,
      "created_by": toInt(input.createdBy, "Author (user ID)"),
    });
    const res = await call(ctx, "/candidate/notes/add", { method: "POST", body });
    return asObject(res);
  },
};

export default candidateNoteAdd;
