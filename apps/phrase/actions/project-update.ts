import type { ActionDefinition } from "@w6w/types";
import { encodeId, PhraseClient } from "../lib/client.ts";

/**
 * `PATCH /v2/projects/{projectId}` — change a project's name, main format or key settings. Only the fields you set are sent.
 */
interface Input {
  projectId: string;
  name?: string;
  mainFormat?: string;
  enableBranching?: boolean;
  enableIcuMessageFormat?: boolean;
}

const projectUpdate: ActionDefinition<Input> = {
  key: "project-update",
  type: "perform",
  resource: "project",
  title: "Update Project",
  description:
    "Change a project's name, main format or key settings. Only the fields you set are sent.",
  idempotent: true,
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "Phrase Strings project id (from List Projects, or the project URL).",
    },
    { key: "name", label: "Name", type: "string" },
    { key: "mainFormat", label: "Main format", type: "string", hint: "A format `api_name`." },
    { key: "enableBranching", label: "Enable branching", type: "boolean" },
    { key: "enableIcuMessageFormat", label: "Enable ICU message format", type: "boolean" },
  ],
  output: [{ key: "id", type: "string", label: "ID" }],

  execute(input, ctx) {
    return new PhraseClient(ctx).json(`/projects/${encodeId(input.projectId)}`, {
      method: "PATCH",
      body: {
        name: input.name,
        main_format: input.mainFormat,
        enable_branching: input.enableBranching,
        enable_icu_message_format: input.enableIcuMessageFormat,
      },
    });
  },
};

export default projectUpdate;
