import { pollFromListAction } from "../../_shared/poll/mod.ts";
import videoSearch from "../actions/video-search.ts";

/**
 * `GET /videos` takes `query`, `sort=date` and `direction=desc`, per
 * https://developer.vimeo.com/api/reference/videos (2026-11-10), so page 1 is the newest
 * matches.
 */
export default pollFromListAction({
  key: "new-search-video",
  title: "New Video Matching Search",
  description: "The run gets each newly uploaded public video that matches the search.",
  action: videoSearch as never,
  params: [{
    key: "query",
    label: "Search query",
    type: "string",
    required: true,
    placeholder: "staff picks",
    hint: "Vimeo searches every public video for this text.",
  }],
  input: (p) => ({ query: p.query, sort: "date", direction: "desc", page: 1, perPage: 100 }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (i) => String((i as { uri?: unknown }).uri ?? ""),
  output: [
    { key: "uri", type: "string", label: "URI" },
    { key: "name", type: "string", label: "Name" },
    { key: "link", type: "string", label: "Link" },
    { key: "created_time", type: "string", label: "Created" },
  ],
  sample: {
    uri: "/videos/258684937",
    name: "Staff pick",
    link: "https://vimeo.com/258684937",
    created_time: "2026-11-09T12:00:00+00:00",
  },
  maxPages: 1,
});
