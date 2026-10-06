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

/** List article summaries in a workspace (id, title, category, status, versions, content hash). Fetch the body with Article: Get. */
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

const workspaceArticleList: ActionDefinition<Input> = {
  key: "workspace-article-list",
  type: "read",
  resource: "workspace",
  title: "List Workspace Articles",
  description:
    "List article summaries in a workspace (id, title, category, status, versions, content hash). Fetch the body with Article: Get.",
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
      c.projectPath(input.projectId, `/workspaces/${encodeId(input.workspaceId)}/articles`),
      {
        ...pagingQuery(input),
        lang_code: input.langCode,
        include_archived: input.includeArchived ? true : undefined,
      },
    );
  },
};

export default workspaceArticleList;
