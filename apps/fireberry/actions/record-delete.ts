import type { ActionDefinition } from "@w6w/types";
import { FireberryClient, seg } from "../lib/client.ts";
import { OBJECT_PARAM } from "../lib/params.ts";

interface Input {
  object: string;
  recordId: string;
}

/** `DELETE /api/record/{object}/{id}`. */
const recordDelete: ActionDefinition<Input> = {
  key: "record-delete",
  type: "perform",
  resource: "record",
  title: "Delete Record",
  description: "Delete one record of any object by its GUID. This cannot be undone.",
  idempotent: true,
  params: [
    OBJECT_PARAM,
    {
      key: "recordId",
      label: "Record ID",
      type: "string",
      required: true,
      hint: "The record's GUID.",
    },
  ],
  output: [{ key: "deleted", type: "boolean", label: "True when Fireberry reported success" }],

  async execute(input, ctx) {
    await new FireberryClient(ctx).request(
      "DELETE",
      `/api/record/${seg(input.object)}/${seg(input.recordId)}`,
    );
    return { deleted: true };
  },
};

export default recordDelete;
