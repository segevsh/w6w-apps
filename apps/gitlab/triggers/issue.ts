import { webhookTrigger } from "../lib/triggers.ts";

/** Issue activity; `actions` narrows it (e.g. `open`). */
const issue = webhookTrigger({
  key: "issue",
  title: "Issue Event",
  description:
    "Fires on issue activity (open, update, close, reopen). The run gets the action and the issue.",
  kind: "issue",
  flag: "issues_events",
  hasActions: true,
  output: [
    { key: "payload.object_attributes", type: "object", label: "Issue" },
    { key: "payload.object_attributes.iid", type: "number", label: "Issue number" },
    { key: "payload.object_attributes.title", type: "string", label: "Title" },
    { key: "payload.object_attributes.url", type: "string", label: "URL" },
    { key: "payload.object_attributes.state", type: "string", label: "State" },
  ],
  samplePayload: {
    object_kind: "issue",
    user: { username: "jsmith" },
    project: { path_with_namespace: "gitlab-org/gitlab-test" },
    object_attributes: {
      iid: 23,
      title: "New API: create/update/delete file",
      state: "opened",
      action: "open",
      url: "http://example.com/gitlab-org/gitlab-test/-/issues/23",
    },
  },
});

export default issue;
