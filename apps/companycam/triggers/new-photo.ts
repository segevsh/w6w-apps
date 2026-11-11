import type { ActionDefinition } from "@w6w/types";
import photoList from "../actions/photo-list.ts";
import { cursored, secondsMs, sinceFilterTrigger } from "../lib/triggers.ts";

// `GET /v2/photos` has no documented order and filters on CAPTURE time only (`start_date`:
// 'captured on or after'), so each window starts 2 hours behind the cursor, pages by the
// `X-Next-Cursor` cursor, and keeps photos uploaded after the seed (`created_at`). A photo
// uploaded more than 2 hours after it was captured (long offline spell) is missed. Doc:
// https://docs.companycam.com/reference/listphotos
export default sinceFilterTrigger({
  key: "new-photo",
  title: "New Photo",
  description: "The run gets each newly uploaded photo.",
  overlapMs: 7_200_000,
  // Remember every id a 2 h re-read can return (thousands on a busy account), so none repeats.
  seenWindow: 20_000,
  load: cursored(
    photoList as unknown as ActionDefinition,
    (_p, from) => ({ startDate: String(Math.floor((from ?? 0) / 1000)) }),
  ),
  idOf: (item) => String(item.id ?? ""),
  tsOf: (item) => secondsMs(item.created_at),
  output: [
    { key: "id", type: "string", label: "Photo ID" },
    { key: "project_id", type: "string", label: "Project ID" },
    { key: "creator_name", type: "string", label: "Captured by" },
    { key: "photo_url", type: "string", label: "Photo URL" },
    { key: "captured_at", type: "number", label: "Captured (Unix seconds)" },
    { key: "created_at", type: "number", label: "Uploaded (Unix seconds)" },
  ],
  sample: {
    id: "1234",
    project_id: "5001",
    creator_name: "Ada Roe",
    photo_url: "https://example.com/photo.jpg",
    captured_at: 1762646300,
    created_at: 1762646400,
  },
});
