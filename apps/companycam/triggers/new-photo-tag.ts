import type { ActionDefinition } from "@w6w/types";
import photoTagList from "../actions/photo-tag-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

// `GET /v2/photos/{id}/tags` for the photo the user picks; a photo carries a handful of tags,
// snapshotted each check (brief 9.1c).
export default snapshotTrigger<{ photoId: string }>({
  key: "new-photo-tag",
  title: "New Photo Tag",
  description: "The run gets each tag newly applied to one photo.",
  params: [
    {
      key: "photoId",
      label: "Photo ID",
      type: "string",
      required: true,
      hint: "The photo to watch.",
    },
  ],
  action: photoTagList as unknown as ActionDefinition,
  input: (p) => ({ photoId: p.photoId }),
  output: [
    { key: "id", type: "string", label: "Tag ID" },
    { key: "display_value", type: "string", label: "Display value" },
    { key: "value", type: "string", label: "Value" },
    { key: "created_at", type: "number", label: "Created (Unix seconds)" },
  ],
  sample: {
    id: "2001",
    display_value: "Roof",
    value: "roof",
    created_at: 1762646400,
    updated_at: 1762646400,
  },
});
