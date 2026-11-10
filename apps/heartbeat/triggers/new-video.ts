import { snapshotTrigger } from "../lib/triggers.ts";
import listVideos from "../actions/list-videos.ts";

/**
 * `GET /v0/videos` returns every native video in one unpaged response
 * (https://heartbeat.readme.io/reference/getvideos); a video appears there only once its
 * asynchronous processing is done, so each check diffs the ids against the previous one
 * (`pollSnapshot`, added only). More than 5000 videos throws an Error naming the kit cap.
 */
export default snapshotTrigger({
  key: "new-video",
  title: "New Video",
  description: "The run gets each native Heartbeat video once it has finished processing.",
  action: listVideos,
  field: "videos",
  output: [
    { key: "id", type: "string", label: "Video ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "aspectRatio", type: "string", label: "Aspect ratio" },
    { key: "duration", type: "number", label: "Duration" },
    { key: "views", type: "number", label: "Views" },
  ],
  sample: {
    id: "9e455d01-82d8-41a4-a176-fa4d9462e08b",
    name: "Welcome tour",
    createdAt: "2026-11-10T09:30:00.000Z",
    aspectRatio: "16:9",
    duration: 94,
    views: 0,
  },
});
