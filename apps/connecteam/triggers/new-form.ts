import { collectPages, snapshotTrigger } from "../lib/triggers.ts";
import formList from "../actions/form-list.ts";

/**
 * Bounded collection (brief 9.1 c): a company has a few forms, and `GET /forms/v1/forms` is
 * walked to its end through `limit` (max 300) and `offset`
 * (https://developer.connecteam.com/openapi/connecteam-api-documentation.json , verified
 * 2026-11-10). The kit refuses more than 5000 rows.
 */
export default snapshotTrigger({
  key: "new-form",
  title: "New Form",
  description: "The run gets each form newly created in the Connecteam account.",
  output: [
    { key: "formId", type: "number", label: "Form ID" },
    { key: "formName", type: "string", label: "Form name" },
    { key: "createdAt", type: "number", label: "Created at (Unix seconds)" },
    { key: "lastUpdatedAt", type: "number", label: "Last updated at (Unix seconds)" },
  ],
  sample: {
    formId: 4001,
    formName: "Vehicle inspection",
    createdAt: 1762680000,
    lastUpdatedAt: 1762683600,
  },
  fetchRows: (_params, ctx) =>
    collectPages(300, async (offset, limit) => {
      const out = await formList.execute({ limit, offset }, ctx) as { forms?: unknown[] };
      return out.forms ?? [];
    }),
  idOf: (row) => (row as { formId?: unknown }).formId,
});
