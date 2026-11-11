import { pagedSnapshotTrigger } from "../lib/polls.ts";
import templateList from "../actions/template-list.ts";

/**
 * `GET /v3/templates?limit=100` (the `template-list` action): the API-ready templates of the
 * workspace, created by hand in the HeyGen editor, so a small collection. The vendor documents no
 * order, so the whole list is diffed.
 */
const newTemplate = pagedSnapshotTrigger({
  key: "new-template",
  title: "New Template",
  description:
    "The run gets each API-ready HeyGen template newly added to the workspace, with its id, name and aspect ratio.",
  action: templateList,
  input: (token) => ({ limit: 100, token }),
  maxPages: 20,
  output: [
    { key: "id", type: "string", label: "Template ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "aspect_ratio", type: "string", label: "Aspect ratio" },
    { key: "created_at", type: "number", label: "Created at (Unix seconds)" },
  ],
  sample: {
    id: "tpl_8f3a21",
    name: "Product launch",
    aspect_ratio: "16:9",
    created_at: 1762776000,
    updated_at: 1762776000,
  },
});

export default newTemplate;
