import { pollFromListAction } from "../../_shared/poll/mod.ts";
import boardList from "../actions/board-list.ts";

/**
 * Miro documents `sort` on get-boards as "applicable only when you search for boards by team or
 * project" (https://developers.miro.com/reference/get-boards-1.md), so a team id is required here:
 * without it the order would be the vendor default, not newest-created.
 */
export default pollFromListAction({
  key: "new-board",
  title: "New Board",
  description: "The run gets each newly created Miro board in a team (optionally one project).",
  action: boardList,
  input: (params: { teamId: string; projectId?: string }) => {
    if (!params?.teamId) {
      throw new Error(
        "new-board: the Team ID parameter is required (Miro sorts boards only within a team or project)",
      );
    }
    return {
      returnAll: false,
      limit: 50,
      teamId: params.teamId,
      projectId: params.projectId || "",
      sort: "last_created",
    };
  },
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [
    {
      key: "teamId",
      label: "Team ID",
      type: "string",
      required: true,
      hint: "Boards are listed newest-created first within this team.",
    },
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      hint: "Optional: only boards in this project.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Board ID" }],
  sample: { id: "board-new", name: "New board" },
  maxPages: 1,
});
