import { pollFromListAction } from "../../_shared/poll/mod.ts";
import showcaseVideoList from "../actions/showcase-video-list.ts";

/**
 * `GET /me/albums/{showcase}/videos` takes `sort=date` and `direction=desc`, per
 * https://developer.vimeo.com/api/reference/showcases (2026-11-10). `date` is the video's
 * own date, so a video added from older uploads may sit below page 1.
 */
export default pollFromListAction({
  key: "new-showcase-video",
  title: "New Showcase Video",
  description: "The run gets each newly uploaded video in the showcase.",
  action: showcaseVideoList as never,
  params: [{
    key: "showcaseId",
    label: "Showcase ID",
    type: "string",
    required: true,
    placeholder: "12345",
    hint: "The numeric showcase (album) ID, or a full `/albums/12345` URI.",
  }],
  input: (p) => ({
    showcaseId: p.showcaseId,
    sort: "date",
    direction: "desc",
    page: 1,
    perPage: 100,
  }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (i) => String((i as { uri?: unknown }).uri ?? ""),
  output: [
    { key: "uri", type: "string", label: "URI" },
    { key: "name", type: "string", label: "Name" },
    { key: "created_time", type: "string", label: "Created" },
  ],
  sample: {
    uri: "/videos/258684937",
    name: "Launch day",
    created_time: "2026-11-09T12:00:00+00:00",
  },
  maxPages: 1,
});
