import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/dataset-list.ts";
import { idOf, itemsOf, NEWEST_FIRST } from "../lib/triggers.ts";

// GET /datasets?desc=1&limit=100&offset=0 — "desc: if true or 1 then the objects are sorted by the
// createdAt field in descending order. By default, they are sorted in ascending order."
// https://docs.apify.com/api/v2/datasets-get
// Named ones only unless "Include unnamed" is on (every Actor run makes an unnamed one).
export default pollFromListAction<{ includeUnnamed?: boolean }>({
  key: "new-dataset",
  title: "New Dataset",
  description: "The run gets each dataset newly created on the account.",
  action,
  params: [{
    key: "includeUnnamed",
    label: "Include unnamed",
    type: "boolean",
    hint: "Also fire for unnamed ones, which every Actor run creates (noisy; they expire).",
  }],
  input: (params) => ({ ...NEWEST_FIRST, unnamed: params.includeUnnamed === true }),
  items: itemsOf,
  idOf,
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: { id: "dataset-101", name: "my-dataset", createdAt: "2026-11-09T10:00:00.000Z" },
  maxPages: 1,
});
