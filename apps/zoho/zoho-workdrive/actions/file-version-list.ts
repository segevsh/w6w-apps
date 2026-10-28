import type { ActionDefinition } from "@w6w/types";
import { listResult, WorkDriveClient } from "../lib/client.ts";
import { listOutput, resourceId } from "../lib/params.ts";

interface Input {
  resourceId: string;
}

/** `GET /files/{resource_id}/versions`. */
const fileVersionList: ActionDefinition<Input> = {
  key: "file-version-list",
  type: "read",
  resource: "file",
  title: "List File Versions",
  description: "List the stored versions of a file.",
  params: [resourceId],
  output: [...listOutput],

  async execute(input, ctx) {
    const body = await new WorkDriveClient(ctx).get(
      `/files/${encodeURIComponent(input.resourceId)}/versions`,
    );
    return listResult(body);
  },
};

export default fileVersionList;
