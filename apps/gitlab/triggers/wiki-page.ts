import { webhookTrigger } from "../lib/triggers.ts";

/** Wiki page activity; `actions` narrows it (e.g. `create`). */
const wikiPage = webhookTrigger({
  key: "wiki-page",
  title: "Wiki Page Event",
  description:
    "Fires when a wiki page is created, edited or deleted. The run gets the action and the page.",
  kind: "wiki_page",
  flag: "wiki_page_events",
  hasActions: true,
  output: [
    { key: "payload.wiki_page", type: "object", label: "Wiki page" },
    { key: "payload.object_attributes", type: "object", label: "Page attributes" },
    { key: "payload.object_attributes.title", type: "string", label: "Title" },
    { key: "payload.object_attributes.url", type: "string", label: "URL" },
  ],
  samplePayload: {
    object_kind: "wiki_page",
    user: { username: "jsmith" },
    project: { path_with_namespace: "gitlab-org/gitlab-test" },
    object_attributes: {
      title: "Awesome",
      slug: "awesome",
      url: "https://example.com/gitlab-org/gitlab-test/-/wikis/awesome",
      action: "create",
    },
  },
});

export default wikiPage;
