import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import teamMemberList from "../actions/team-member-list.ts";
import { teamId } from "../lib/params.ts";

/**
 * `GET /teams/{team_id}/users` ("This API fetches all members of a WorkDrive team") documents
 * only `filter[user]` and `search[all]` — no paging — so the whole membership is one request and
 * the kit's 5000-row cap guards it.
 */
const trigger: TriggerDefinition = {
  key: "new-team-member",
  title: "New Team Member",
  description: "The run gets each member newly added to the WorkDrive team.",
  params: [teamId],
  output: [
    { key: "id", type: "string", label: "Member ID" },
    { key: "type", type: "string", label: "Resource type" },
    { key: "attributes", type: "object", label: "Member attributes (email_id, member_type, …)" },
  ],
  sample: {
    id: "ly9zmae16b43c258f458a9a57ac02c4f8d763-2774428000000002001",
    type: "users",
    attributes: { email_id: "zylker@zylker.com", member_type: 1 },
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const result = await teamMemberList.execute(
      { teamId: String((params as { teamId?: string }).teamId ?? "") },
      ctx,
    ) as { items?: Array<Record<string, unknown>> };
    const { events, nextState } = await pollSnapshot({
      state,
      maxRows: 5000,
      emit: { added: true, updated: false, removed: false },
      rows: (result.items ?? []).map((item) => ({ key: String(item.id ?? ""), values: item })),
    });
    return { events: events.map((event) => event.values), nextState };
  },
};
export default trigger;
