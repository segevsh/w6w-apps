import { webhookTrigger } from "../lib/triggers.ts";

/** Release activity; `actions` narrows it (e.g. `create`). */
const release = webhookTrigger({
  key: "release",
  title: "Release Event",
  description:
    "Fires when a release is created, updated or deleted. The run gets the action and the release.",
  kind: "release",
  flag: "releases_events",
  hasActions: true,
  output: [
    { key: "payload.tag", type: "string", label: "Tag" },
    { key: "payload.name", type: "string", label: "Release name" },
    { key: "payload.url", type: "string", label: "URL" },
    { key: "payload.description", type: "string", label: "Description" },
  ],
  samplePayload: {
    object_kind: "release",
    action: "create",
    tag: "v1.1",
    name: "v1.1",
    description: "Release notes",
    url: "https://example.com/gitlab-org/gitlab-test/-/releases/v1.1",
    project: { path_with_namespace: "gitlab-org/gitlab-test" },
  },
});

export default release;
