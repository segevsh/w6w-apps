import type { TriggerDefinition } from "@w6w/types";
import listForms from "../actions/list-forms.ts";
import { newRecords } from "../lib/triggers.ts";

/** `limit` is documented as "maximum up to 50, default 10". */
const PAGE = 50;
/** 40 pages x 50 = 2000 forms; a location with more fails loudly instead of missing some. */
const MAX_PAGES = 40;

/**
 * `GET /forms/` pages with `skip` and `limit` (max 50, default 10) and returns `forms` and `total`
 * (https://marketplace.gohighlevel.com/docs/ghl/forms/get-forms, verified 2026-11-10); there is no
 * sort key, so the whole collection is read: pages of 50 through `list-forms` until a short page
 * (or `total`) ends it, then the ids are diffed (`pollSnapshot`, added only). A location's forms
 * are a small bounded collection.
 */
const newForm: TriggerDefinition = {
  key: "new-form",
  title: "New Form",
  description:
    "Checks the connected HighLevel location for forms created since the last check. The run gets each new form (id, name, location).",
  output: [
    { key: "id", type: "string", label: "Form ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "locationId", type: "string", label: "Location ID" },
  ],
  sample: { id: "sample-form-id", name: "Contact us", locationId: "sample-location-id" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const items: unknown[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await listForms.execute({ skip: page * PAGE, limit: PAGE }, ctx) as {
        forms?: unknown[];
        total?: unknown;
      };
      const forms = res.forms ?? [];
      items.push(...forms);
      const total = typeof res.total === "number" ? res.total : undefined;
      if (forms.length < PAGE || (total !== undefined && items.length >= total)) {
        return newRecords({ state, items, what: "form" });
      }
    }
    throw new Error(
      `HighLevel returned more than ${MAX_PAGES * PAGE} forms; New Form cannot read them all.`,
    );
  },
};

export default newForm;
