import type { ActionDefinition } from "@w6w/types";
import { encodeId, HexClient, type HexCursorPage } from "../lib/client.ts";
import { CURSOR_OUTPUT, type CursorInput, cursorParams, projectIdParam } from "../lib/params.ts";

/** `GET /v1/projects/{projectId}/queriedTables` — warehouse tables the project's SQL reads. */
interface Input extends CursorInput {
  projectId: string;
}

const projectQueriedTablesList: ActionDefinition<Input> = {
  key: "project-queried-tables-list",
  type: "search",
  resource: "project",
  title: "List Project Queried Tables",
  description: "List the data-warehouse tables a project queries.",
  params: [projectIdParam, ...cursorParams(100)],
  output: [...CURSOR_OUTPUT],

  execute(input, ctx) {
    return new HexClient(ctx).json<HexCursorPage<unknown>>(
      `/projects/${encodeId(input.projectId)}/queriedTables`,
      { query: { limit: input.limit, after: input.after } },
    );
  },
};

export default projectQueriedTablesList;
