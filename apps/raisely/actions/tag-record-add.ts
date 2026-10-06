import type { ActionDefinition } from "@w6w/types";
import { RaiselyClient, seg, toUuids } from "../lib/client.ts";

interface Input {
  uuid: string;
  records: string | string[];
}

const tagRecordAdd: ActionDefinition<Input> = {
  key: "tag-record-add",
  type: "perform",
  resource: "tag",
  title: "Add Tag to Records",
  description:
    "Assign a tag to one or more records (users, profiles, ... of the tag's record type).",
  idempotent: true,
  params: [
    { key: "uuid", label: "Tag uuid", type: "string", required: true },
    {
      key: "records",
      label: "Record uuids",
      type: "multiselect",
      required: true,
      hint: "uuids of the records to tag; a comma-separated string also works.",
    },
  ],
  output: [{ key: "data", type: "array", label: "Assignments (tagUuid per record)" }],

  async execute(input, ctx) {
    const uuids = toUuids(input.records);
    if (uuids.length === 0) throw new Error("records must name at least one record uuid");
    return await new RaiselyClient(ctx).data(`/tags/${seg(input.uuid)}/records`, {
      method: "POST",
      body: { data: uuids.map((uuid) => ({ uuid })) },
    });
  },
};

export default tagRecordAdd;
