import uploadPresetList from "../actions/upload-preset-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** `GET /upload_presets` pages by `next_cursor` (max_results ≤ 500); keyed by preset name.
 * https://cloudinary.com/documentation/admin_api#get_upload_presets */
export default snapshotTrigger({
  key: "new-upload-preset",
  title: "New Upload Preset",
  description: "The run gets each upload preset newly created in the account.",
  action: uploadPresetList,
  input: () => ({ returnAll: true }),
  items: (result) => (result as { presets?: unknown[] }).presets ?? [],
  keyOf: (item) => String((item as { name?: unknown }).name ?? ""),
  output: [
    { key: "name", type: "string", label: "Preset name" },
    { key: "unsigned", type: "boolean", label: "Unsigned" },
    { key: "settings", type: "object", label: "Preset settings" },
  ],
  sample: { name: "sample-preset", unsigned: false, settings: { folder: "products" } },
});
