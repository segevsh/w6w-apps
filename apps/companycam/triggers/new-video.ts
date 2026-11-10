import type { ActionDefinition } from "@w6w/types";
import videoList from "../actions/video-list.ts";
import { numbered, secondsMs, sinceFilterTrigger } from "../lib/triggers.ts";

// `GET /v2/videos` filters on CAPTURE time only (`start_date`: 'captured on or after'), so each
// window starts 2 hours behind the cursor and keeps videos uploaded after the seed (`created_at`).
// A video uploaded more than 2 hours after capture is missed. Doc:
// https://docs.companycam.com/reference/listvideos
export default sinceFilterTrigger({
  key: "new-video",
  title: "New Video",
  description: "The run gets each newly uploaded video.",
  overlapMs: 7_200_000,
  // Remember every id a 2 h re-read can return (thousands on a busy account), so none repeats.
  seenWindow: 20_000,
  load: numbered(
    videoList as unknown as ActionDefinition,
    (_p, from) => ({ startDate: String(Math.floor((from ?? 0) / 1000)) }),
  ),
  idOf: (item) => String(item.id ?? ""),
  tsOf: (item) => secondsMs(item.created_at),
  output: [
    { key: "id", type: "string", label: "Video ID" },
    { key: "project_id", type: "string", label: "Project ID" },
    { key: "creator_name", type: "string", label: "Captured by" },
    { key: "status", type: "string", label: "Status" },
    { key: "captured_at", type: "number", label: "Captured (Unix seconds)" },
    { key: "created_at", type: "number", label: "Uploaded (Unix seconds)" },
  ],
  sample: {
    id: "1500",
    project_id: "5001",
    creator_name: "Ada Roe",
    status: "processed",
    captured_at: 1762646300,
    created_at: 1762646400,
  },
});
