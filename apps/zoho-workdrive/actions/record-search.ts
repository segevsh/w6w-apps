import type { ActionDefinition } from "@w6w/types";
import { listResult, WorkDriveClient } from "../lib/client.ts";
import { limit, listOutput, offset, teamId } from "../lib/params.ts";

interface Input {
  teamId: string;
  query: string;
  teamFolderId?: string;
  parentId?: string;
  limit?: number;
  offset?: number;
}

/**
 * `GET /teams/{team_id}/records?search[all]=…` — needs the extra scope
 * `ZohoSearch.securesearch.READ` in addition to `WorkDrive.team.READ`.
 */
const recordSearch: ActionDefinition<Input> = {
  key: "record-search",
  type: "search",
  resource: "file",
  title: "Search Files and Folders",
  description: "Search a team's files and folders by name and content.",
  params: [
    teamId,
    { key: "query", label: "Query", type: "string", required: true },
    {
      key: "teamFolderId",
      label: "Team Folder ID",
      type: "string",
      hint: "Limit to one team folder.",
    },
    { key: "parentId", label: "Folder ID", type: "string", hint: "Limit to one folder." },
    limit,
    offset,
  ],
  output: [...listOutput],

  async execute(input, ctx) {
    const body = await new WorkDriveClient(ctx).get(
      `/teams/${encodeURIComponent(input.teamId)}/records`,
      {
        "search[all]": input.query,
        "filter[teamFolder]": input.teamFolderId,
        "filter[parentId]": input.parentId,
        "page[limit]": input.limit,
        "page[offset]": input.offset,
      },
    );
    return listResult(body);
  },
};

export default recordSearch;
