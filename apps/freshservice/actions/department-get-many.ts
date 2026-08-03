import type { ActionDefinition } from "@w6w/types";
import { FreshserviceClient } from "../lib/client.ts";
import { pagination, workspaceId } from "../lib/params.ts";

interface Input {
  workspaceId?: number;
  page?: number;
  perPage?: number;
}

const departmentGetMany: ActionDefinition<Input> = {
  key: "department-get-many",
  type: "read",
  resource: "department",
  title: "List Departments",
  description: "List departments. Called Companies in Freshservice for MSPs.",
  params: [
    workspaceId,
    ...pagination,
  ],
  output: [{ key: "departments", type: "array", label: "Departments" }],

  async execute(input, ctx) {
    const departments = await new FreshserviceClient(ctx).resource<unknown[]>(
      "departments",
      "/departments",
      { query: { workspace_id: input.workspaceId, page: input.page, per_page: input.perPage } },
    );
    return { departments };
  },
};

export default departmentGetMany;
