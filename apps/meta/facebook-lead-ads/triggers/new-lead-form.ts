import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import type { FacebookListResponse } from "../lib/client.ts";
import listForms from "../actions/list-forms.ts";

/** Pages of Graph's default size read per check (a Page holds a few dozen forms at most). */
const MAX_PAGES = 20;

/**
 * Bounded snapshot of one Page's forms: `GET /{page_id}/leadgen_forms` documents no order or
 * created-since filter, so every page of the connection is read (Graph `after` cursor, followed
 * while `paging.next` is present) and diffed by form id. A Page with more than 20 pages of
 * forms fails the check with an error naming the cap rather than reading part of it.
 */
const trigger: TriggerDefinition<{ pageId?: string }> = {
  key: "new-lead-form",
  title: "New Lead Ads Form",
  description: "The run gets each lead-generation form newly created on the chosen Facebook Page.",
  params: [{
    key: "pageId",
    label: "Page ID",
    type: "string",
    required: true,
    hint: "The Facebook Page whose lead forms to watch.",
  }],
  output: [
    { key: "id", type: "string", label: "Form ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "locale", type: "string", label: "Locale" },
  ],
  sample: { id: "222222222222", name: "November offer", status: "ACTIVE", locale: "en_US" },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const pageId = params?.pageId?.trim();
    if (!pageId) throw new Error("Page ID is required");
    const forms: Array<{ id?: unknown }> = [];
    let cursor: string | undefined;
    for (let page = 0;; page++) {
      if (page >= MAX_PAGES) {
        throw new Error(
          `Facebook Page has more than ${MAX_PAGES} pages of lead forms; the New Lead Ads Form trigger is capped there`,
        );
      }
      const body = await listForms.execute({ pageId, cursor }, ctx) as FacebookListResponse<
        { id?: unknown }
      >;
      forms.push(...(body?.data ?? []));
      const after = body?.paging?.cursors?.after;
      if (!body?.paging?.next || !after) break;
      cursor = after;
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows: forms.map((form) => ({ key: String(form.id ?? ""), values: form })),
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
