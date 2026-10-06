import type { ActionDefinition } from "@w6w/types";
import { encodeId, PhraseClient } from "../lib/client.ts";

/**
 * `GET /v2/projects/{projectId}` — fetch one project, including its main format and account.
 */
interface Input {
  projectId: string;
}

const projectGet: ActionDefinition<Input> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Fetch one project, including its main format and account.",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "Phrase Strings project id (from List Projects, or the project URL).",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "main_format", type: "string", label: "Main file format" },
    { key: "account", type: "object", label: "Owning account" },
  ],

  execute(input, ctx) {
    return new PhraseClient(ctx).json(`/projects/${encodeId(input.projectId)}`);
  },
};

export default projectGet;
