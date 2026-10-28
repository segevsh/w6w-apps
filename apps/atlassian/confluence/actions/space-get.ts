import type { ActionDefinition } from "@w6w/types";
import { ConfluenceClient } from "../lib/client.ts";

/**
 * `GET /wiki/api/v2/spaces/{id}` — verified against Confluence Cloud's REST
 * API v2 OpenAPI document (`getSpaceById`). The path takes the numeric space
 * **ID**, not the space key.
 */
const action: ActionDefinition = {
  key: "space-get",
  type: "read",
  resource: "space",
  title: "Get a space",
  description: "Retrieve one space by its numeric ID.",
  params: [
    {
      key: "spaceId",
      label: "Space ID",
      type: "string",
      required: true,
      default: "",
      hint: "The numeric ID from List spaces — not the space key.",
    },
    {
      key: "descriptionFormat",
      label: "Description Format",
      type: "select",
      default: "",
      options: [
        { value: "plain", label: "Plain" },
        { value: "view", label: "View (rendered HTML)" },
      ],
    },
    { key: "includeLabels", label: "Include Labels", type: "boolean", default: false },
    { key: "includePermissions", label: "Include Permissions", type: "boolean", default: false },
  ],
  output: [
    { key: "id", type: "string", label: "Space ID" },
    { key: "key", type: "string", label: "Space key" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Type" },
    { key: "status", type: "string", label: "Status" },
    { key: "homepageId", type: "string", label: "Homepage ID" },
    { key: "authorId", type: "string", label: "Author account ID" },
    { key: "description", type: "object", label: "Description" },
    { key: "_links", type: "object", label: "Links" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const spaceId = String(p.spaceId ?? "").trim();
    if (!spaceId) throw new Error("`spaceId` is required");

    const client = new ConfluenceClient(ctx);
    ctx.log("info", "getting Confluence space", { spaceId });

    return await client.request(`/spaces/${encodeURIComponent(spaceId)}`, {
      query: {
        "description-format": (p.descriptionFormat as string) || undefined,
        "include-labels": p.includeLabels === true ? "true" : undefined,
        "include-permissions": p.includePermissions === true ? "true" : undefined,
      },
    });
  },
};

export default action;
