import type { ActionDefinition } from "@w6w/types";
import { encodeId, PhraseClient } from "../lib/client.ts";
import { pageOutput, paginationParams } from "../lib/params.ts";

/**
 * `GET /v2/projects/{projectId}/uploads` — list a project's uploads and their processing state.
 */
interface Input {
  projectId: string;
  branch?: string;
  page?: number;
  perPage?: number;
}

const uploadList: ActionDefinition<Input> = {
  key: "upload-list",
  type: "search",
  resource: "upload",
  title: "List Uploads",
  description: "List a project's uploads and their processing state.",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "Phrase Strings project id (from List Projects, or the project URL).",
    },
    {
      key: "branch",
      label: "Branch",
      type: "string",
      hint: "Branch name, for projects with branching enabled. Leave empty for the main branch.",
    },
    ...paginationParams(),
  ],
  output: [...pageOutput],

  execute(input, ctx) {
    return new PhraseClient(ctx).list(`/projects/${encodeId(input.projectId)}/uploads`, {
      branch: input.branch,
      page: input.page,
      per_page: input.perPage,
    });
  },
};

export default uploadList;
