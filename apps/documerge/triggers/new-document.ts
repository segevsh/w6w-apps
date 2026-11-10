import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import documentList from "../actions/document-list.ts";

/**
 * Wraps `document-list` (`GET /api/documents`). The endpoint takes no paging or filter
 * parameters (`parameters: []` in https://app.documerge.ai/api-docs/openapi.yaml), so one request
 * returns the account's whole document (merge template) collection: a bounded snapshot, and the
 * kit refuses a collection above 5000 rows.
 */
const trigger: TriggerDefinition = {
  key: "new-document",
  title: "New Document",
  description: "The run gets each newly created DocuMerge document (merge template).",
  params: [],
  output: [
    { key: "id", type: "number", label: "Document ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Type" },
    { key: "output", type: "string", label: "Output format" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: { id: 1, name: "Invoice", type: "html", output: "pdf", status: "Active" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const result = await (documentList as ActionDefinition).execute({}, ctx) as { data?: unknown };
    const data = result?.data;
    const items = (Array.isArray(data) ? data : []) as Array<Record<string, unknown>>;
    const { events, nextState } = await pollSnapshot({
      state,
      rows: items.map((item) => ({
        key: String(item.id ?? ""),
        values: {
          id: item.id,
          name: item.name,
          type: item.type,
          output: item.output,
          status: item.status,
        },
      })),
      emit: { added: true, updated: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
