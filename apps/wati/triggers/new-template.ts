import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import templatesList from "../actions/templates-list.ts";

/** `page_size` is documented as "max 100"; `page_number` is 1-based. */
const PAGE = 100;
const MAX_PAGES = 50;

/**
 * `GET /api/ext/v3/messageTemplates` through `templates-list`, read page by page until `total`
 * (WhatsApp caps an account's message templates, so the collection is small; more than 5000 rows
 * throws). Wati documents no sort order or since filter
 * (https://docs.wati.io/reference/messagetemplate_getmessagetemplates.md), so the whole
 * collection is snapshot-diffed (additions only).
 */
const trigger: TriggerDefinition = {
  key: "new-template",
  title: "New Message Template",
  description: "The run gets each WhatsApp message template newly added to the Wati account.",
  output: [
    { key: "id", type: "string", label: "Template ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: { id: "template_123", name: "Welcome Message", status: "APPROVED" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const rows: Array<{ key: string; values: unknown }> = [];
    for (let pageNumber = 1;; pageNumber++) {
      if (pageNumber > MAX_PAGES) throw new Error("Wati template snapshot exceeds 5000 rows");
      const out = await templatesList.execute({ pageNumber, pageSize: PAGE }, ctx) as {
        templates?: unknown[];
        total?: number;
      };
      const page = out.templates ?? [];
      for (const value of page) {
        rows.push({ key: String((value as { id?: unknown }).id ?? ""), values: value });
      }
      if (page.length < PAGE || (typeof out.total === "number" && rows.length >= out.total)) break;
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows,
      emit: { added: true, updated: false, removed: false },
      maxRows: 5000,
    });
    return { events: events.map((event) => event.values), nextState };
  },
};

export default trigger;
