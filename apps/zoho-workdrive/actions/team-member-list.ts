import type { ActionDefinition } from "@w6w/types";
import { listResult, WorkDriveClient } from "../lib/client.ts";
import { listOutput, teamId } from "../lib/params.ts";

interface Input {
  teamId: string;
  zuids?: string;
  search?: string;
}

/** `GET /teams/{team_id}/users`. */
const teamMemberList: ActionDefinition<Input> = {
  key: "team-member-list",
  type: "read",
  resource: "team",
  title: "List Team Members",
  description: "List the members of a WorkDrive team, optionally filtered by ZUID or a search.",
  params: [
    teamId,
    {
      key: "zuids",
      label: "ZUIDs",
      type: "string",
      hint: "Comma-separated ZUIDs to fetch specific members (filter[user]).",
    },
    { key: "search", label: "Search", type: "string", hint: "Free-text member search." },
  ],
  output: [...listOutput],

  async execute(input, ctx) {
    const body = await new WorkDriveClient(ctx).get(
      `/teams/${encodeURIComponent(input.teamId)}/users`,
      { "filter[user]": input.zuids, "search[all]": input.search },
    );
    return listResult(body);
  },
};

export default teamMemberList;
