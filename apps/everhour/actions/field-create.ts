import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient, toArray, toObject } from "../lib/client.ts";

/**
 * `POST /projects/{projectId}/fields` — Create a custom field in a project.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  projectId: string;
  name: string;
  type: string;
  format?: unknown;
  icon?: string;
  options?: unknown;
}

const fieldCreate: ActionDefinition<Input> = {
  key: "field-create",
  type: "perform",
  resource: "field",
  title: "Create Project Field",
  description: "Create a custom field in a project.",
  idempotent: false,
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint:
        "Everhour project id: `ev:1234567890` for a native project, or `{platform}:{id}` such as `as:123456` for an integration project.",
    },
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [{ value: "number", label: "number" }, { value: "text", label: "text" }, {
        value: "select",
        label: "select",
      }, { value: "date", label: "date" }],
    },
    {
      key: "format",
      label: "Format",
      type: "json",
      hint:
        'JSON `{"format": "number"|"currency"|"percent"|"label", "decimals": 2, "label": "US$", "labelAt": "left", "type": "date"|"dob"}`.',
    },
    { key: "icon", label: "Icon", type: "string" },
    {
      key: "options",
      label: "Options",
      type: "json",
      hint: "JSON array of `{name, color}` (up to 10) for a `select` field.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Field ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Field type" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/projects/${encodeId(input.projectId)}/fields`, {
      method: "POST",
      body: compact({
        name: input.name,
        type: input.type,
        format: toObject(input.format, "format"),
        icon: input.icon,
        options: toArray(input.options, "options"),
      }),
    });
  },
};

export default fieldCreate;
