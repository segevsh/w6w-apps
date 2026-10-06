import type { ActionDefinition } from "@w6w/types";
import { MurfClient, toList } from "../lib/client.ts";

interface Input {
  projectId: string;
  targetLocales: unknown;
}

const updateDubbingProject: ActionDefinition<Input> = {
  key: "update-dubbing-project",
  type: "perform",
  resource: "dubbing-project",
  title: "Update Dubbing Project",
  description:
    "Set a Murf Dub project's target locales (PUT /v1/murfdub/projects/{project_id}/update). The documented body carries only `target_locales`; whether the list replaces or extends the existing one is not stated by Murf, so read the project back to confirm. Needs the Murf Dub API key.",
  idempotent: true,
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    {
      key: "targetLocales",
      label: "Target locales",
      type: "text",
      required: true,
      placeholder: "fr_FR, es_ES",
      hint: "Comma or newline separated.",
    },
  ],
  output: [
    { key: "project_id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "source_locale", type: "string", label: "Source locale" },
    { key: "dubbing_type", type: "string", label: "Dubbing type" },
    { key: "target_locales", type: "array", label: "Target locales" },
  ],

  async execute(input, ctx) {
    if (!input.projectId?.trim()) throw new Error("projectId is required");
    return await new MurfClient(ctx).call(
      `/v1/murfdub/projects/${encodeURIComponent(input.projectId.trim())}/update`,
      { method: "PUT", body: { target_locales: toList(input.targetLocales, "targetLocales") } },
    );
  },
};

export default updateDubbingProject;
