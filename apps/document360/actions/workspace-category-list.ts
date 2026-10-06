import type { ActionDefinition } from "@w6w/types";
import { Document360Client, encodeId } from "../lib/client.ts";
import {
  langCodeParam,
  listOutput,
  pagingParams,
  pagingQuery,
  projectIdParam,
  workspaceIdParam,
} from "../lib/params.ts";

/** List a workspace's categories as a tree (each node carries child_categories). Articles are excluded; use Workspace: List Articles. */
interface Input {
  projectId?: string;
  workspaceId: string;
  langCode?: string;
  includeArchived?: boolean;
  page?: number;
  pageSize?: number;
  cursor?: string;
  includeTotalCount?: boolean;
}

const workspaceCategoryList: ActionDefinition<Input> = {
  key: "workspace-category-list",
  type: "read",
  resource: "workspace",
  title: "List Workspace Categories",
  description:
    "List a workspace's categories as a tree (each node carries child_categories). Articles are excluded; use Workspace: List Articles.",
  params: [projectIdParam, workspaceIdParam, langCodeParam, {
    key: "includeArchived",
    label: "Include archived",
    type: "boolean",
    default: false,
  }, ...pagingParams],
  output: listOutput,

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    return await c.list(
      c.projectPath(input.projectId, `/workspaces/${encodeId(input.workspaceId)}/categories`),
      {
        ...pagingQuery(input),
        lang_code: input.langCode,
        include_archived: input.includeArchived ? true : undefined,
      },
    );
  },
};

export default workspaceCategoryList;
