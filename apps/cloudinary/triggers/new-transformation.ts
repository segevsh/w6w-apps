import transformationList from "../actions/transformation-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** `GET /transformations` pages by `next_cursor` (max_results ≤ 500); keyed by transformation name.
 * https://cloudinary.com/documentation/admin_api#get_transformations */
export default snapshotTrigger({
  key: "new-transformation",
  title: "New Transformation",
  description:
    "The run gets each transformation newly seen; by default only named transformations, not the ones Cloudinary generates from URL traffic.",
  action: transformationList,
  params: [{
    key: "named",
    label: "Named Only",
    type: "boolean",
    default: true,
    hint: "Skip the transformations Cloudinary generated from delivery URLs.",
  }],
  input: (params) => ({ named: params.named !== false, returnAll: true }),
  items: (result) => (result as { transformations?: unknown[] }).transformations ?? [],
  keyOf: (item) => String((item as { name?: unknown }).name ?? ""),
  output: [
    { key: "name", type: "string", label: "Name" },
    { key: "allowed_for_strict", type: "boolean", label: "Allowed for strict" },
    { key: "used", type: "boolean", label: "Used" },
    { key: "named", type: "boolean", label: "Named" },
  ],
  sample: { name: "thumb_square", allowed_for_strict: true, used: false, named: true },
});
