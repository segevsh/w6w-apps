import type { ActionDefinition } from "@w6w/types";
import { GitLabClient, projectPath, unset } from "../lib/client.ts";
import { projectId } from "../lib/params.ts";

interface Input {
  projectId: string;
  tagName: string;
  name?: string;
  description?: string;
  ref?: string;
}

const releaseCreate: ActionDefinition<Input> = {
  key: "release-create",
  type: "perform",
  resource: "release",
  title: "Create Release",
  description: "Publish a release for a tag. Pass a ref to create the tag if it doesn't exist.",
  // The tag is the natural key: a retry lands on "release already exists" for
  // the tag rather than creating a duplicate.
  idempotent: false,
  params: [
    projectId,
    { key: "tagName", label: "Tag", type: "string", required: true },
    { key: "name", label: "Release name", type: "string" },
    {
      key: "description",
      label: "Notes",
      type: "text",
      config: { multiline: true },
      hint: "Markdown.",
    },
    {
      key: "ref",
      label: "Ref",
      type: "string",
      hint: "Branch or commit SHA to create the tag from. Required only if the tag doesn't exist.",
    },
  ],
  output: [
    { key: "tag_name", type: "string", label: "Tag" },
    { key: "name", type: "string", label: "Name" },
    { key: "_links", type: "object", label: "Links" },
  ],

  execute(input, ctx) {
    return new GitLabClient(ctx).request(`/projects/${projectPath(input.projectId)}/releases`, {
      method: "POST",
      body: {
        tag_name: input.tagName,
        name: unset(input.name),
        description: unset(input.description),
        ref: unset(input.ref),
      },
    });
  },
};

export default releaseCreate;
