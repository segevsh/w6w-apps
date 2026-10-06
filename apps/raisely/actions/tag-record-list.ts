import type { ActionDefinition } from "@w6w/types";
import { RaiselyClient, seg } from "../lib/client.ts";
import { type ListInput, listParams, listQuery, privateParam } from "../lib/params.ts";

interface Input extends ListInput {
  uuid: string;
}

const tagRecordList: ActionDefinition<Input> = {
  key: "tag-record-list",
  type: "read",
  resource: "tag",
  title: "List Tagged Records",
  description: "List the records carrying a tag. Each entry is `{uuid, tags}`.",
  params: [
    { key: "uuid", label: "Tag uuid", type: "string", required: true },
    privateParam(),
    ...listParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Records (uuid + tags)" },
    { key: "pagination", type: "object", label: "Pagination (total, pages, offset, limit)" },
  ],

  async execute(input, ctx) {
    return await new RaiselyClient(ctx).list(`/tags/${seg(input.uuid)}/records`, {
      query: listQuery(input),
    });
  },
};

export default tagRecordList;
