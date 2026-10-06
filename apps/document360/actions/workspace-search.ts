import type { ActionDefinition } from "@w6w/types";
import { Document360Client, encodeId } from "../lib/client.ts";
import {
  langCodeParam,
  listOutput,
  pageParam,
  pageSizeParam,
  pagingQuery,
  projectIdParam,
  workspaceIdParam,
} from "../lib/params.ts";

/** Keyword search across the published, visible articles of a workspace. */
interface Input {
  projectId?: string;
  workspaceId: string;
  query: string;
  langCode?: string;
  page?: number;
  pageSize?: number;
}

const workspaceSearch: ActionDefinition<Input> = {
  key: "workspace-search",
  type: "search",
  resource: "workspace",
  title: "Search Workspace",
  description: "Keyword search across the published, visible articles of a workspace.",
  params: [
    projectIdParam,
    workspaceIdParam,
    { key: "query", label: "Query", type: "string", required: true },
    langCodeParam,
    pageParam,
    pageSizeParam,
  ],
  output: listOutput,

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    const { page, page_size } = pagingQuery(input);
    return await c.list(
      c.projectPath(input.projectId, `/workspaces/${encodeId(input.workspaceId)}/search`),
      { query: input.query, lang_code: input.langCode, page, page_size },
    );
  },
};

export default workspaceSearch;
