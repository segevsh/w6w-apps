import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import invoiceList from "../actions/invoice-list.ts";

/**
 * Small bounded collection: `GET /invoices` answers every invoice in one response with no
 * pagination support (https://developers.everhour.com/pagination.md). The set is diffed each
 * check and only additions are emitted (edits, status changes and removals are not);
 * `pollSnapshot` throws past 5000 rows.
 */
const trigger: TriggerDefinition = {
  key: "new-invoice",
  title: "New Invoice",
  description: "The run gets each invoice newly created in the Everhour account.",
  output: [
    { key: "id", type: "number", label: "Invoice ID" },
    { key: "status", type: "string", label: "draft, sent or paid" },
    { key: "totalAmount", type: "number", label: "Total in cents" },
    { key: "invoiceItems", type: "array", label: "Line items" },
  ],
  sample: { id: 501, status: "draft", totalAmount: 120000, invoiceItems: [] },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const out = await invoiceList.execute({}, ctx) as { items?: Array<{ id?: unknown }> };
    const invoices = Array.isArray(out?.items) ? out.items : [];
    const { events, nextState } = await pollSnapshot({
      state,
      rows: invoices.map((invoice) => ({ key: String(invoice.id ?? ""), values: invoice })),
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
