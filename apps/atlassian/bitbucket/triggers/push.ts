import { webhookTrigger } from "../lib/triggers.ts";

const push = webhookTrigger({
  key: "push",
  title: "New Push",
  description:
    "Fires when commits are pushed to a repository. The run gets the changes (branches and tags updated, with their new and old commits).",
  event: "repo:push",
  output: [
    { key: "payload.push.changes", type: "array", label: "Changes" },
  ],
  samplePayload: {
    push: {
      changes: [{
        new: {
          type: "branch",
          name: "main",
          target: { hash: "709d658dc5b6d6afcd46049c2f332ee3f515a67d" },
        },
        old: {
          type: "branch",
          name: "main",
          target: { hash: "1e65c05c1d5171631d92438a13901ca7dae9618c" },
        },
        created: false,
        closed: false,
      }],
    },
    repository: { full_name: "teamsinspace/documentation-tests" },
    actor: { display_name: "Emma" },
  },
});

export default push;
