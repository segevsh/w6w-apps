import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import memberList from "../actions/member-list.ts";

/** Most members one snapshot holds; `pollSnapshot` throws above this instead of truncating. */
const MAX_ROWS = 5000;

/**
 * `GET /organization/members` answers a bare array of the organization's members and takes no
 * paging parameters (OpenAPI `Get members`), so one request returns the whole team — a small
 * bounded collection that is snapshotted and diffed (added only).
 */
const trigger: TriggerDefinition = {
  key: "new-member",
  title: "New Team Member",
  description: "The run gets each member newly added to the Salesmsg organization.",
  output: [
    { key: "change", type: "string", label: "Change (added)" },
    { key: "key", type: "string", label: "Member ID" },
    { key: "values", type: "object", label: "Member (id, email, full_name, role, …)" },
  ],
  sample: {
    change: "added",
    key: "61",
    values: { id: 61, email: "ada@example.test", full_name: "Ada Lovelace", role: "member" },
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const res = await memberList.execute({}, ctx) as { items?: Array<{ id?: unknown }> };
    return await pollSnapshot({
      state,
      maxRows: MAX_ROWS,
      emit: { added: true, updated: false },
      rows: (res.items ?? []).filter((m) => m.id !== undefined && m.id !== null).map((m) => ({
        key: String(m.id),
        values: m,
      })),
    });
  },
};

export default trigger;
