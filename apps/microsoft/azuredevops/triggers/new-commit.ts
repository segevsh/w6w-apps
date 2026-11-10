import type { TriggerDefinition } from "@w6w/types";
import { pollCommits } from "../lib/feeds.ts";

interface Params {
  project: string;
  repository: string;
  branch?: string;
}

const trigger: TriggerDefinition<Params> = {
  key: "new-commit",
  title: "New Commit",
  description:
    "The run gets each commit pushed to a repository (optionally one branch) since the previous check.",
  params: [
    { key: "project", label: "Project", type: "string", required: true },
    { key: "repository", label: "Repository", type: "string", required: true },
    {
      key: "branch",
      label: "Branch",
      type: "string",
      hint: "Empty = the repository's default branch.",
    },
  ],
  output: [
    { key: "commitId", type: "string", label: "Commit SHA" },
    { key: "comment", type: "string", label: "Commit message" },
    { key: "author", type: "object", label: "Author (name, email, date)" },
    { key: "committer", type: "object", label: "Committer (name, email, date)" },
  ],
  sample: {
    commitId: "9991b4f66def4c0a9ad8f9f27043ece7eddcf1c7",
    comment: "Fix login redirect",
    author: { name: "Sample Author", email: "author@example.com", date: "2026-11-10T09:00:00Z" },
    committer: { name: "Sample Author", email: "author@example.com", date: "2026-11-10T09:00:00Z" },
  },
  minIntervalMs: 300_000,
  poll: ({ params, state }, ctx) => pollCommits(params, state, ctx),
};

export default trigger;
