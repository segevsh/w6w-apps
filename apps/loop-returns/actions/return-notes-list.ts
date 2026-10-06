import type { ActionDefinition } from "@w6w/types";
import { encodeId, LoopClient, LoopError } from "../lib/client.ts";

/**
 * List Return Notes.
 *
 * `GET /warehouse/return/{id}/notes`. A return with no notes is answered HTTP 422 with the bare body `false`; that is returned as an empty list, not an error.
 */
interface Input {
  returnId: number;
}

const action: ActionDefinition<Input> = {
  key: "return-notes-list",
  type: "read",
  resource: "return",
  title: "List Return Notes",
  description: "Read the notes on a return.",
  params: [
    {
      key: "returnId",
      label: "Return ID",
      type: "number",
      required: true,
      hint: "Loop's numeric return id (the `id` of a return from Return List / Get Return).",
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "notes", type: "array", label: "Notes: id, content, created_at" },
  ],

  async execute(input, ctx) {
    try {
      const res = await new LoopClient(ctx).get(
        `/warehouse/return/${encodeId(input.returnId)}/notes`,
      );
      return { notes: Array.isArray(res) ? res : [] };
    } catch (e) {
      if (e instanceof LoopError && e.status === 422 && e.body === false) return { notes: [] };
      throw e;
    }
  },
};

export default action;
