import type { ActionDefinition } from "@w6w/types";
import { compact, MurfClient, toList } from "../lib/client.ts";

interface Input {
  name: string;
  dubbingType: string;
  targetLocales: unknown;
  sourceLocale?: string;
  description?: string;
}

const createDubbingProject: ActionDefinition<Input> = {
  key: "create-dubbing-project",
  type: "perform",
  resource: "dubbing-project",
  title: "Create Dubbing Project",
  description:
    "Create a Murf Dub project (POST /v1/murfdub/projects/create) to hold persistent, editable dubs. Not idempotent: a retry creates a second project. Needs the Murf Dub API key.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "dubbingType",
      label: "Dubbing type",
      type: "select",
      required: true,
      options: [
        { value: "AUTOMATED", label: "Automated" },
        { value: "QA", label: "QA (with quality review)" },
      ],
    },
    {
      key: "targetLocales",
      label: "Target locales",
      type: "text",
      required: true,
      placeholder: "fr_FR, de_DE",
      hint: "Comma or newline separated.",
    },
    { key: "sourceLocale", label: "Source locale", type: "string", placeholder: "en_US" },
    { key: "description", label: "Description", type: "string" },
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
    if (!input.name?.trim()) throw new Error("name is required");
    if (!input.dubbingType) throw new Error("dubbingType is required");
    return await new MurfClient(ctx).call("/v1/murfdub/projects/create", {
      method: "POST",
      body: compact({
        name: input.name.trim(),
        dubbing_type: input.dubbingType,
        target_locales: toList(input.targetLocales, "targetLocales"),
        source_locale: input.sourceLocale,
        description: input.description,
      }),
    });
  },
};

export default createDubbingProject;
