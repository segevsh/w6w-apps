import { pollFromListAction } from "../../_shared/poll/mod.ts";
import showcaseList from "../actions/showcase-list.ts";

/**
 * `GET /me/albums` takes `sort=date` (date created) and `direction=desc`, per the Showcases reference
 * https://developer.vimeo.com/api/reference/showcases (2026-11-10), so page 1 is the newest showcases.
 */
export default pollFromListAction({
  key: "new-showcase",
  title: "New Showcase",
  description: "The run gets each newly created showcase.",
  action: showcaseList as never,
  input: () => ({ sort: "date", direction: "desc", page: 1, perPage: 100 }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (i) => String((i as { uri?: unknown }).uri ?? ""),
  output: [
    { key: "uri", type: "string", label: "Showcase URI" },
    { key: "name", type: "string", label: "Name" },
    { key: "link", type: "string", label: "Link" },
    { key: "created_time", type: "string", label: "Created" },
  ],
  sample: {
    uri: "/users/1/albums/12345",
    name: "Best of 2026",
    link: "https://vimeo.com/showcase/12345",
    created_time: "2026-11-09T12:00:00+00:00",
  },
  maxPages: 1,
});
