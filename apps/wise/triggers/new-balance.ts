import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import balanceList from "../actions/balance-list.ts";

/**
 * `balance-list`: `GET /profiles/{profileId}/balances?types=STANDARD,SAVINGS` returns every balance
 * of one profile in a single response (a bare array, one per currency plus any savings jars;
 * https://docs.wise.com/api-reference/balance, verified 2026-11-10). Bounded. Additions only.
 */
const trigger: TriggerDefinition<{ profileId: number }> = {
  key: "new-balance",
  title: "New Balance",
  description:
    "The run gets each balance (a currency account or a savings jar) newly opened on the chosen Wise profile.",
  params: [{
    key: "profileId",
    label: "Profile ID",
    type: "number",
    required: true,
    validation: { integer: true },
    hint: "Personal or business profile ID — from the List Profiles action.",
  }],
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Balance ID" },
    { key: "values", type: "object", label: "Balance" },
  ],
  sample: {
    change: "added",
    key: "111",
    values: { id: 111, currency: "GBP", type: "STANDARD", name: null },
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const result = await balanceList.execute({
      profileId: params.profileId,
      types: ["STANDARD", "SAVINGS"],
    }, ctx) as { items?: Array<{ id?: number | string; [key: string]: unknown }> };
    return await pollSnapshot({
      state,
      rows: (result.items ?? []).flatMap((b) =>
        b.id !== undefined && b.id !== null ? [{ key: String(b.id), values: b }] : []
      ),
      emit: { added: true, updated: false },
      maxRows: 5000,
    });
  },
};

export default trigger;
