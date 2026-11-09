import { webhookTrigger } from "../lib/triggers.ts";

/** Merge request activity; `actions` narrows it (e.g. `open,merge`). */
const mergeRequest = webhookTrigger({
  key: "merge-request",
  title: "Merge Request Event",
  description:
    "Fires on merge request activity (open, update, approve, merge, close and more). The run gets the action and the merge request.",
  kind: "merge_request",
  flag: "merge_requests_events",
  hasActions: true,
  output: [
    { key: "payload.object_attributes", type: "object", label: "Merge request" },
    { key: "payload.object_attributes.iid", type: "number", label: "Merge request number" },
    { key: "payload.object_attributes.title", type: "string", label: "Title" },
    { key: "payload.object_attributes.url", type: "string", label: "URL" },
    { key: "payload.object_attributes.state", type: "string", label: "State" },
  ],
  samplePayload: {
    object_kind: "merge_request",
    user: { username: "jsmith" },
    project: { path_with_namespace: "gitlab-org/gitlab-test" },
    object_attributes: {
      iid: 1,
      title: "MS-Viewport",
      state: "opened",
      action: "open",
      source_branch: "ms-viewport",
      target_branch: "master",
      url: "http://example.com/gitlab-org/gitlab-test/-/merge_requests/1",
    },
  },
});

export default mergeRequest;
