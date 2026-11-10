import tagList from "../actions/tag-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** `GET /tags/{resource_type}` pages by `next_cursor` (max_results ≤ 500); a tag is its name.
 * https://cloudinary.com/documentation/admin_api#get_tags */
export default snapshotTrigger({
  key: "new-tag",
  title: "New Tag",
  description:
    "The run gets each tag that starts being used on assets of the chosen resource type.",
  action: tagList,
  params: (tagList.params ?? []).filter((p) => p.key === "resourceType" || p.key === "prefix"),
  input: (params) => ({
    resourceType: params.resourceType ?? "image",
    prefix: params.prefix ?? "",
    returnAll: true,
  }),
  items: (result) => (result as { tags?: unknown[] }).tags ?? [],
  keyOf: (item) => String(item ?? ""),
  output: [{ key: "tag", type: "string", label: "Tag" }],
  sample: "campaign:spring",
});
