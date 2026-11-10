import { webhookTrigger } from "../lib/triggers.ts";

/** Any GitLab project webhook event: the `events` param picks which kinds (blank is all of them). */
const anyEvent = webhookTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on the GitLab webhook kinds you list, or on all of them when the list is blank. The run gets the event kind, the action and the payload.",
  sampleKind: "emoji",
  hasActions: false,
  output: [],
  samplePayload: {
    object_kind: "emoji",
    event_type: "award",
    user: { username: "jsmith" },
    project: { path_with_namespace: "gitlab-org/gitlab-test" },
    object_attributes: { id: 1, name: "thumbsup", action: "award" },
  },
});

export default anyEvent;
