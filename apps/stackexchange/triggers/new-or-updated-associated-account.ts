import { pollSnapshot } from "../../_shared/poll/mod.ts";
import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import action from "../actions/user-associated-list.ts";

type Params = { accountIds: string };

const trigger: TriggerDefinition<Params> = {
  key: "new-or-updated-associated-account",
  title: "New or Updated Associated Account",
  description: "The run gets each added or changed site account for the selected network account.",
  minIntervalMs: 300_000,
  params: (action.params ?? []).filter((param) => param.key === "accountIds"),
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Associated account key" },
    { key: "values", type: "object", label: "Associated account" },
  ],
  sample: {
    change: "added",
    key: "stackoverflow:101",
    values: { site_url: "stackoverflow", user_id: 101 },
  },
  async poll(input, ctx) {
    const rows: unknown[] = [];
    for (let page = 1; page <= 5; page++) {
      const result = await (action as unknown as ActionDefinition).execute!(
        { accountIds: input.params.accountIds, page, pageSize: 100 },
        ctx,
      ) as { items?: unknown[]; hasMore?: boolean };
      rows.push(...(result.items ?? []));
      if (!result.hasMore) break;
      if (page === 5) {
        throw new Error(
          "Associated-account snapshot exceeds 500 rows; narrow the account selection",
        );
      }
    }
    return await pollSnapshot({
      state: input.state,
      rows: rows.map((item) => {
        const account = item as {
          site_url?: unknown;
          site_name?: unknown;
          user_id?: unknown;
          account_id?: unknown;
          user_type?: unknown;
        };
        return {
          key: `${account.site_url ?? ""}:${account.user_id ?? ""}`,
          // Stable fields only: reputation and answer counts change constantly and would re-fire every check.
          values: {
            site_url: account.site_url,
            site_name: account.site_name,
            user_id: account.user_id,
            account_id: account.account_id,
            user_type: account.user_type,
          },
        };
      }),
      maxRows: 500,
    });
  },
};

export default trigger;
