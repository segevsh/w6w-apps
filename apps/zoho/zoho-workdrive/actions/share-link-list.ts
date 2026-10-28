import type { ActionDefinition } from "@w6w/types";
import { listResult, WorkDriveClient } from "../lib/client.ts";
import { listOutput, resourceId } from "../lib/params.ts";

interface Input {
  resourceId: string;
  type?: string;
}

/** `GET /files/{resource_id}/links`. */
const shareLinkList: ActionDefinition<Input> = {
  key: "share-link-list",
  type: "read",
  resource: "link",
  title: "List External Links",
  description: "List the external share links of a file or folder.",
  params: [
    resourceId,
    {
      key: "type",
      label: "Link Type",
      type: "select",
      options: [{ value: "custom", label: "custom" }, { value: "download", label: "download" }],
    },
  ],
  output: [...listOutput],

  async execute(input, ctx) {
    const body = await new WorkDriveClient(ctx).get(
      `/files/${encodeURIComponent(input.resourceId)}/links`,
      { "filter[type]": input.type },
    );
    return listResult(body);
  },
};

export default shareLinkList;
