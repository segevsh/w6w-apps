import type { ActionDefinition } from "@w6w/types";
import { PhraseClient } from "../lib/client.ts";

/**
 * `POST /v2/projects` — create a project in an account.
 */
interface Input {
  name: string;
  accountId?: string;
  mainFormat?: string;
  sourceProjectId?: string;
  enableBranching?: boolean;
  enableIcuMessageFormat?: boolean;
}

const projectCreate: ActionDefinition<Input> = {
  key: "project-create",
  type: "perform",
  resource: "project",
  title: "Create Project",
  description: "Create a project in an account.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      hint: "Required when the token can see more than one account. See List Accounts.",
    },
    {
      key: "mainFormat",
      label: "Main format",
      type: "string",
      hint: "A format `api_name`, e.g. `json`, `yml`, `strings`. See List Formats.",
    },
    {
      key: "sourceProjectId",
      label: "Source project ID",
      type: "string",
      hint: "Clone settings and content from this project.",
    },
    { key: "enableBranching", label: "Enable branching", type: "boolean" },
    { key: "enableIcuMessageFormat", label: "Enable ICU message format", type: "boolean" },
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "slug", type: "string", label: "Slug" },
  ],

  execute(input, ctx) {
    return new PhraseClient(ctx).json(`/projects`, {
      method: "POST",
      body: {
        name: input.name,
        account_id: input.accountId,
        main_format: input.mainFormat,
        source_project_id: input.sourceProjectId,
        enable_branching: input.enableBranching,
        enable_icu_message_format: input.enableIcuMessageFormat,
      },
    });
  },
};

export default projectCreate;
