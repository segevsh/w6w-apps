import type { ActionDefinition } from "@w6w/types";
import { RaiselyClient, seg } from "../lib/client.ts";

interface Input {
  uuid: string;
  recordUuid: string;
}

const tagRecordRemove: ActionDefinition<Input> = {
  key: "tag-record-remove",
  type: "perform",
  resource: "tag",
  title: "Remove Tag from Record",
  description: "Unassign a tag from one record.",
  idempotent: true,
  params: [
    { key: "uuid", label: "Tag uuid", type: "string", required: true },
    {
      key: "recordUuid",
      label: "Record uuid",
      type: "string",
      required: true,
      hint: "The uuid of the record being unassigned from the tag.",
    },
  ],
  output: [{ key: "data", type: "array", label: "Removed (recordUuid, tagUuid)" }],

  async execute(input, ctx) {
    return await new RaiselyClient(ctx).data(
      `/tags/${seg(input.uuid)}/records/${seg(input.recordUuid)}`,
      { method: "DELETE" },
    );
  },
};

export default tagRecordRemove;
