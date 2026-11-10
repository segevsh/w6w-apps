import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import conversionRuleList from "../actions/conversion-rule-list.ts";

const COUNT = 100;
/** 50 pages of 100 = the kit's 5000-row snapshot ceiling. */
const MAX_PAGES = 50;

/**
 * `GET /rest/conversions?q=account` returns every Conversion Rule of one Ad Account (a small,
 * account-scoped set) through `start`/`count` paging; a new id is a new rule.
 */
const trigger: TriggerDefinition<{ accountId: string }> = {
  key: "new-conversion-rule",
  title: "New Conversion Rule",
  description: "The run gets each conversion rule newly created in an Ad Account.",
  params: [{
    key: "accountId",
    label: "Ad Account ID",
    type: "string",
    required: true,
    hint: "The numeric Ad Account (sponsored account) id.",
  }],
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Conversion rule ID" },
    { key: "values", type: "object", label: "Conversion rule" },
  ],
  sample: {
    change: "added",
    key: "1001",
    values: { id: 1001, name: "Newsletter signup", type: "LEAD" },
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const rows: Array<{ key: string; values: unknown }> = [];
    let start = 0;
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await conversionRuleList.execute(
        { accountId: params.accountId, start, count: COUNT },
        ctx,
      ) as { elements?: Array<{ id?: number | string }>; paging?: { total?: number } };
      const elements = res.elements ?? [];
      for (const e of elements) {
        if (e.id !== undefined) rows.push({ key: String(e.id), values: e });
      }
      start += elements.length;
      const total = res.paging?.total;
      if (
        elements.length === 0 ||
        (typeof total === "number" ? start >= total : elements.length < COUNT)
      ) break;
    }
    return await pollSnapshot({
      state,
      rows,
      emit: { added: true, updated: false },
      maxRows: 5000,
    });
  },
};

export default trigger;
