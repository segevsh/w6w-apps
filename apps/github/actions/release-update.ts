import type { ActionDefinition } from "@w6w/types";
import { GitHubClient, repoPath, unset } from "../lib/client.ts";
import { owner, repository } from "../lib/params.ts";

interface Input {
  owner: string;
  repository: string;
  releaseId: number;
  tagName?: string;
  name?: string;
  body?: string;
  draft?: boolean;
  prerelease?: boolean;
}

const releaseUpdate: ActionDefinition<Input> = {
  key: "release-update",
  type: "perform",
  resource: "release",
  title: "Update Release",
  description: "Edit a release — commonly to publish a draft by setting Draft to false.",
  idempotent: true,
  params: [
    owner,
    repository,
    { key: "releaseId", label: "Release ID", type: "number", required: true },
    { key: "tagName", label: "Tag", type: "string" },
    { key: "name", label: "Release name", type: "string" },
    { key: "body", label: "Notes", type: "text", config: { multiline: true } },
    { key: "draft", label: "Draft", type: "boolean", row: "flags" },
    { key: "prerelease", label: "Pre-release", type: "boolean", row: "flags" },
  ],
  output: [
    { key: "id", type: "number", label: "Release ID" },
    { key: "html_url", type: "string", label: "URL" },
  ],

  execute(input, ctx) {
    return new GitHubClient(ctx).request(
      `/repos/${repoPath(input.owner, input.repository)}/releases/${input.releaseId}`,
      {
        method: "PATCH",
        body: {
          tag_name: unset(input.tagName),
          name: unset(input.name),
          body: unset(input.body),
          draft: input.draft,
          prerelease: input.prerelease,
        },
      },
    );
  },
};

export default releaseUpdate;
