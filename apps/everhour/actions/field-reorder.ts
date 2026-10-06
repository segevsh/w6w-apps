import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient, toNumberList } from "../lib/client.ts";

/**
 * `PUT /projects/{projectId}/fields-order` — Set the order of a project's custom fields.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  projectId: string;
  order: number[] | string;
}

const fieldReorder: ActionDefinition<Input> = {
  key: "field-reorder",
  type: "perform",
  resource: "field",
  title: "Reorder Project Fields",
  description: "Set the order of a project's custom fields.",
  idempotent: true,
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint:
        "Everhour project id: `ev:1234567890` for a native project, or `{platform}:{id}` such as `as:123456` for an integration project.",
    },
    {
      key: "order",
      label: "Field IDs in order",
      type: "string",
      required: true,
      hint: "Comma-separated custom field ids, in the new order.",
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
    return new EverhourClient(ctx).many(`/projects/${encodeId(input.projectId)}/fields-order`, {
      method: "PUT",
      body: compact({ order: toNumberList(input.order) }),
    });
  },
};

export default fieldReorder;
