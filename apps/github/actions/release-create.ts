import type { ActionDefinition } from "@w6w/types";
import { GitHubClient, repoPath, unset } from "../lib/client.ts";
import { owner, repository } from "../lib/params.ts";

interface Input {
  owner: string;
  repository: string;
  tagName: string;
  name?: string;
  body?: string;
  targetCommitish?: string;
  draft?: boolean;
  prerelease?: boolean;
  generateReleaseNotes?: boolean;
}

const releaseCreate: ActionDefinition<Input> = {
  key: "release-create",
  type: "perform",
  resource: "release",
  title: "Create Release",
  description: "Publish a release for a tag, optionally letting GitHub generate the notes.",
  // Creating a release for an existing tag is rejected — but the tag is the
  // natural key, so a retry lands on "already exists" rather than a duplicate.
  idempotent: false,
  params: [
    owner,
    repository,
    {
      key: "tagName",
      label: "Tag",
      type: "string",
      required: true,
      hint: "Existing tag, or a new one created against the target commitish.",
    },
    { key: "name", label: "Release name", type: "string" },
    { key: "body", label: "Notes", type: "text", config: { multiline: true }, hint: "Markdown." },
    {
      key: "targetCommitish",
      label: "Target",
      type: "string",
      hint: "Branch or commit SHA the tag is created from. Ignored if the tag exists.",
    },
    { key: "draft", label: "Draft", type: "boolean", row: "flags" },
    { key: "prerelease", label: "Pre-release", type: "boolean", row: "flags" },
    {
      key: "generateReleaseNotes",
      label: "Generate notes",
      type: "boolean",
      hint: "Let GitHub build the notes from merged PRs. Appended after any Notes above.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Release ID" },
    { key: "tag_name", type: "string", label: "Tag" },
    { key: "html_url", type: "string", label: "URL" },
    { key: "upload_url", type: "string", label: "Asset upload URL" },
  ],

  execute(input, ctx) {
    return new GitHubClient(ctx).request(
      `/repos/${repoPath(input.owner, input.repository)}/releases`,
      {
        method: "POST",
        body: {
          tag_name: input.tagName,
          name: unset(input.name),
          body: unset(input.body),
          target_commitish: unset(input.targetCommitish),
          draft: input.draft,
          prerelease: input.prerelease,
          generate_release_notes: input.generateReleaseNotes,
        },
      },
    );
  },
};

export default releaseCreate;
