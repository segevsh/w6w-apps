import { webhookTrigger } from "../lib/triggers.ts";

/** A comment on a commit, merge request, issue or snippet. */
const comment = webhookTrigger({
  key: "comment",
  title: "New Comment",
  description:
    "Fires when a comment is added on a commit, merge request, issue or snippet. The run gets the comment and what it is on.",
  kind: "note",
  flag: "note_events",
  hasActions: false,
  output: [
    { key: "payload.object_attributes", type: "object", label: "Comment" },
    { key: "payload.object_attributes.note", type: "string", label: "Comment text" },
    { key: "payload.object_attributes.noteable_type", type: "string", label: "Commented on" },
    { key: "payload.object_attributes.url", type: "string", label: "URL" },
  ],
  samplePayload: {
    object_kind: "note",
    user: { username: "jsmith" },
    project: { path_with_namespace: "gitlab-org/gitlab-test" },
    object_attributes: {
      id: 1244,
      note: "This MR needs work.",
      noteable_type: "MergeRequest",
      url: "http://example.com/gitlab-org/gitlab-test/-/merge_requests/1#note_1244",
    },
  },
});

export default comment;
