import { webhookTrigger } from "../lib/triggers.ts";

/** Tags created or deleted in the repository. */
const tagPush = webhookTrigger({
  key: "tag-push",
  title: "Tag Push Event",
  description:
    "Fires when a tag is created or deleted in the repository. The run gets the tag ref, the commit it points at and the pusher.",
  kind: "tag_push",
  flag: "tag_push_events",
  hasActions: false,
  output: [
    { key: "payload.ref", type: "string", label: "Tag ref" },
    { key: "payload.checkout_sha", type: "string", label: "Commit" },
    { key: "payload.message", type: "string", label: "Tag message" },
    { key: "payload.user_username", type: "string", label: "Pusher" },
  ],
  samplePayload: {
    object_kind: "tag_push",
    ref: "refs/tags/v1.0.0",
    before: "0000000000000000000000000000000000000000",
    after: "82b3d5ae55f7080f1e6022629cdb57bfae7cccc7",
    checkout_sha: "82b3d5ae55f7080f1e6022629cdb57bfae7cccc7",
    message: "Tag message",
    user_username: "jsmith",
    project: { path_with_namespace: "gitlab-org/gitlab-test" },
  },
});

export default tagPush;
