import type { ActionDefinition } from "@w6w/types";
import { encodeId, PhraseClient } from "../lib/client.ts";

/**
 * `PATCH /v2/projects/{projectId}/translations/{translationId}/verify` — mark a translation as verified.
 */
interface Input {
  projectId: string;
  translationId: string;
  branch?: string;
}

const translationVerify: ActionDefinition<Input> = {
  key: "translation-verify",
  type: "perform",
  resource: "translation",
  title: "Verify Translation",
  description: "Mark a translation as verified.",
  idempotent: true,
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "Phrase Strings project id (from List Projects, or the project URL).",
    },
    { key: "translationId", label: "Translation ID", type: "string", required: true },
    {
      key: "branch",
      label: "Branch",
      type: "string",
      hint: "Branch name, for projects with branching enabled. Leave empty for the main branch.",
    },
  ],
  output: [{ key: "id", type: "string", label: "ID" }],

  execute(input, ctx) {
    return new PhraseClient(ctx).json(
      `/projects/${encodeId(input.projectId)}/translations/${encodeId(input.translationId)}/verify`,
      { method: "PATCH", body: { branch: input.branch } },
    );
  },
};

export default translationVerify;
