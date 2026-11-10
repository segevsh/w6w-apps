import { idOf, snapshotTrigger } from "../lib/triggers.ts";
import tagList from "../actions/tag-list.ts";

/**
 * Bounded collection (brief 9.1 c): `GET /v1/tags` returns the organisation's active tags in one
 * response; deactivated tags are left out (`includeDeactivated` is not sent), so retiring a tag
 * is never announced as news (https://docs.dixa.io/openapi/dixa-api/v1/ , verified 2026-11-10).
 */
export default snapshotTrigger({
  key: "new-tag",
  title: "New Tag",
  description: "The run gets each tag newly created in the Dixa organisation.",
  output: [
    { key: "id", type: "string", label: "Tag ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "color", type: "string", label: "Color" },
    { key: "state", type: "string", label: "State" },
  ],
  sample: {
    id: "5c4d3e2f-1a0b-4c9d-8e7f-6a5b4c3d2e1f",
    name: "refund",
    color: "#e5484d",
    state: "Active",
  },
  fetchRows: async (_params, ctx) => {
    const out = await tagList.execute({}, ctx) as { data?: unknown[] };
    return out.data ?? [];
  },
  idOf,
});
