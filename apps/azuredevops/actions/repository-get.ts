import type { ActionDefinition } from "@w6w/types";
import { AzureDevOpsClient } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /{org}/{project}/_apis/git/repositories/{id}` — one repository.
 *
 * Takes a name or an id, like most Azure DevOps paths. The two useful fields
 * are `defaultBranch` — which every other git call wants as a full
 * `refs/heads/…` ref — and `size`, which is the practical warning before
 * anything that clones.
 *
 * `remoteUrl` and `sshUrl` are the addresses a build agent uses, and `webUrl`
 * is the one to put in a notification, because sending somebody a clone URL is
 * a small unkindness.
 */
const action: ActionDefinition = {
  key: "repository-get",
  type: "read",
  resource: "repository",
  title: "Get a repository",
  description:
    "One repository, by name or id. `defaultBranch` comes back as a full `refs/heads/…` ref, " +
    "which is what the other git calls expect.",
  params: [
    PROJECT_PARAM,
    {
      key: "repository",
      label: "Repository",
      type: "string",
      required: true,
      default: "",
      hint: "Name or id.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Repository ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "defaultBranch", type: "string", label: "Full ref, e.g. refs/heads/main" },
    { key: "webUrl", type: "string", label: "The link to send a person" },
    { key: "isDisabled", type: "boolean", label: "Listed, and rejecting every operation" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = String(p.project ?? "").trim();
    const repository = String(p.repository ?? "").trim();
    if (!project) throw new Error("`project` is required");
    if (!repository) throw new Error("`repository` is required");

    const client = new AzureDevOpsClient(ctx);
    return await client.request(
      client.path(project, "_apis/git/repositories", repository),
    );
  },
};

export default action;
