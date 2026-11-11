import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import teamMembersList from "../actions/team-members-list.ts";

/**
 * Small bounded collection (brief §9.1 c): `GET /v1/team/members/list` returns the whole current
 * team in one response with no paging ("Get a list of the members of the user's current team",
 * https://developer.cloze.com/cloze-openapi.json `teamMembersList`, verified 2026-11-10). A
 * member is identified by e-mail. Cloze sends no team-member event, so the list is compared from
 * check to check and only additions emit.
 */
const trigger: TriggerDefinition = {
  key: "new-team-member",
  title: "New Team Member",
  description: "The run gets each member newly added to your Cloze team (checked on a schedule).",
  output: [
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "E-mail" },
  ],
  sample: { name: "Ada Lovelace", email: "ada@example.com" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const out = await teamMembersList.execute({}, ctx) as { list?: Array<{ email?: unknown }> };
    const members = Array.isArray(out?.list) ? out.list : [];
    const { events, nextState } = await pollSnapshot({
      state,
      rows: members.map((m) => ({ key: String(m.email ?? "").toLowerCase(), values: m })),
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((c) => c.values), nextState };
  },
};

export default trigger;
