import type { TriggerDefinition } from "@w6w/types";
import { pollPullRequests } from "../lib/feeds.ts";

interface Params {
  project: string;
  repository: string;
}

const trigger: TriggerDefinition<Params> = {
  key: "new-pull-request",
  title: "New Pull Request",
  description:
    "The run gets each pull request created in a repository since the previous check (any status).",
  params: [
    { key: "project", label: "Project", type: "string", required: true },
    { key: "repository", label: "Repository", type: "string", required: true },
  ],
  output: [
    { key: "pullRequestId", type: "number", label: "Pull request ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
    { key: "creationDate", type: "string", label: "Created at" },
    { key: "sourceRefName", type: "string", label: "Source branch ref" },
    { key: "targetRefName", type: "string", label: "Target branch ref" },
  ],
  sample: {
    pullRequestId: 22,
    title: "Add login page",
    status: "active",
    creationDate: "2026-11-10T09:00:00Z",
    sourceRefName: "refs/heads/feature/login",
    targetRefName: "refs/heads/main",
  },
  minIntervalMs: 300_000,
  poll: ({ params, state }, ctx) => pollPullRequests(params, state, ctx),
};

export default trigger;
