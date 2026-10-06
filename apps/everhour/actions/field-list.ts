import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `GET /projects/{projectId}/fields` — List a project's custom field configuration.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  projectId: string;
}

const fieldList: ActionDefinition<Input> = {
  key: "field-list",
  type: "search",
  resource: "field",
  title: "List Project Fields",
  description: "List a project's custom field configuration.",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint:
        "Everhour project id: `ev:1234567890` for a native project, or `{platform}:{id}` such as `as:123456` for an integration project.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Records" },
    { key: "count", type: "number", label: "Records in this response" },
    {
      key: "nextPage",
      type: "number",
      label: "Next page number, or null when there is no further page",
    },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).many(`/projects/${encodeId(input.projectId)}/fields`);
  },
};

export default fieldList;
