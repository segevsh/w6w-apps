import { pollSnapshot } from "../../_shared/poll/mod.ts";
import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import action from "../actions/user-badge-list.ts";

type Params = { site?: string; userIds: string };

const MAX_PAGES = 10;
const MAX_ROWS = 1000;

const trigger: TriggerDefinition<Params> = {
  key: "new-or-updated-user-badge",
  title: "New or Updated User Badge",
  description:
    "The run gets each badge a selected user earns for the first time, and each badge whose award count rises.",
  minIntervalMs: 300_000,
  params: (action.params ?? []).filter((param) => param.key === "site" || param.key === "userIds"),
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "User and badge key" },
    { key: "values", type: "object", label: "Badge award (badge_id, name, award_count, …)" },
  ],
  sample: {
    change: "added",
    key: "101:22",
    values: { user_id: 101, badge_id: 22, name: "Teacher", rank: "bronze", award_count: 1 },
  },
  async poll(input, ctx) {
    const rows: Array<{ key: string; values: unknown }> = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const result = await (action as unknown as ActionDefinition).execute!(
        { site: input.params.site, userIds: input.params.userIds, page, pageSize: 100 },
        ctx,
      ) as { items?: unknown[]; hasMore?: boolean };
      for (const item of result.items ?? []) {
        const badge = item as {
          badge_id?: unknown;
          name?: unknown;
          rank?: unknown;
          badge_type?: unknown;
          award_count?: unknown;
          user?: { user_id?: unknown };
        };
        const userId = badge.user?.user_id ?? "";
        rows.push({
          key: `${userId}:${badge.badge_id ?? ""}`,
          // Stable fields only: the nested user carries a live reputation that would re-fire every check.
          values: {
            user_id: userId,
            badge_id: badge.badge_id,
            name: badge.name,
            rank: badge.rank,
            badge_type: badge.badge_type,
            award_count: badge.award_count,
          },
        });
      }
      if (!result.hasMore) break;
      if (page === MAX_PAGES) {
        throw new Error(
          `User badge snapshot exceeds ${MAX_ROWS} rows; narrow the user selection`,
        );
      }
    }
    return await pollSnapshot({ state: input.state, rows, maxRows: MAX_ROWS });
  },
};

export default trigger;
