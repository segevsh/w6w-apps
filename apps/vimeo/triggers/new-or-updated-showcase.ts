import { pollFromListAction } from "../../_shared/poll/mod.ts";
import showcaseList from "../actions/showcase-list.ts";

/**
 * `GET /me/albums` takes `sort=last_modified` and `direction=desc`, per
 * https://developer.vimeo.com/api/reference/showcases (2026-11-10). The event id carries the
 * `modified_time`, so an edit is a new event.
 */
export default pollFromListAction({
  key: "new-or-updated-showcase",
  title: "New or Updated Showcase",
  description: "The run gets each showcase that is created or modified.",
  action: showcaseList as never,
  input: () => ({ sort: "last_modified", direction: "desc", page: 1, perPage: 100 }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (i) =>
    `${(i as { uri?: unknown }).uri ?? ""}:${
      (i as { modified_time?: unknown }).modified_time ?? ""
    }`,
  output: [
    { key: "uri", type: "string", label: "Showcase URI" },
    { key: "name", type: "string", label: "Name" },
    { key: "link", type: "string", label: "Link" },
    { key: "modified_time", type: "string", label: "Modified" },
  ],
  sample: {
    uri: "/users/1/albums/12345",
    name: "Best of 2026",
    link: "https://vimeo.com/showcase/12345",
    modified_time: "2026-11-09T12:00:00+00:00",
  },
  maxPages: 1,
});
