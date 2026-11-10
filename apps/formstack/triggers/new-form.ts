import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import formList from "../actions/form-list.ts";

const PAGE_SIZE = 500;

/**
 * Bounded snapshot: `GET /forms` takes `pageSize` (default 50, maximum 500) with no created-since
 * filter, and its documented `orderBy` column names are not listed, so the account's forms are read
 * in one request of the maximum size and diffed by id. The answer carries `page.totalPages`: when it
 * is more than 1 the account holds more than 500 forms and the check fails with an error naming the
 * cap, never a silent partial read (Formstack API V2025, Forms, Retrieve a paginated list of forms).
 */
const trigger: TriggerDefinition = {
  key: "new-form",
  title: "New Form",
  description: "The run gets each form newly created in the Formstack account.",
  output: [
    { key: "id", type: "number", label: "Form ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "active", type: "boolean", label: "Active" },
    { key: "created", type: "string", label: "Created" },
    { key: "updated", type: "string", label: "Last updated" },
    { key: "folder", type: "number", label: "Folder ID" },
  ],
  sample: {
    id: 1234567,
    name: "Contact us",
    active: true,
    created: "2026-11-09 12:00:00",
    updated: "2026-11-09 12:00:00",
    folder: 42,
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const out = await formList.execute({ pageSize: PAGE_SIZE }, ctx) as {
      page?: { totalPages?: number };
      forms?: Array<{ id?: unknown }> | null;
    };
    if (Number(out?.page?.totalPages ?? 1) > 1) {
      throw new Error(
        `Formstack account has more than ${PAGE_SIZE} forms; the New Form trigger is capped there`,
      );
    }
    const forms = Array.isArray(out?.forms) ? out.forms : [];
    const { events, nextState } = await pollSnapshot({
      state,
      rows: forms.map((form) => ({ key: String(form.id ?? ""), values: form })),
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
