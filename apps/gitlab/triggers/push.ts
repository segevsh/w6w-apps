import { webhookTrigger } from "../lib/triggers.ts";

/** Commits pushed to a branch. */
const push = webhookTrigger({
  key: "push",
  title: "New Push",
  description:
    "Fires when commits are pushed to a project. The run gets the ref, the before and after commit ids and the commits pushed.",
  kind: "push",
  flag: "push_events",
  hasActions: false,
  output: [
    { key: "payload.ref", type: "string", label: "Ref" },
    { key: "payload.before", type: "string", label: "Before commit" },
    { key: "payload.after", type: "string", label: "After commit" },
    { key: "payload.total_commits_count", type: "number", label: "Commit count" },
    { key: "payload.commits", type: "array", label: "Commits" },
  ],
  samplePayload: {
    object_kind: "push",
    ref: "refs/heads/master",
    before: "95790bf891e76fee5e1747ab589903a6a1f80f22",
    after: "da1560886d4f094c3e6c9ef40349f7d38b5d27d7",
    user_username: "jsmith",
    total_commits_count: 1,
    commits: [{
      id: "da1560886d4f094c3e6c9ef40349f7d38b5d27d7",
      message: "Update README",
      author: { name: "John Smith" },
    }],
    project: { path_with_namespace: "gitlab-org/gitlab-test" },
  },
});

export default push;
