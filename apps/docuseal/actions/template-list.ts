import type { ActionDefinition } from "@w6w/types";
import { DocuSealClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /templates` — verified against DocuSeal's OpenAPI document
 * (`getTemplates`).
 */
const templateList: ActionDefinition = {
  key: "template-list",
  type: "read",
  resource: "template",
  title: "List Templates",
  description:
    "List document templates, optionally filtered by name, slug, folder or archived state.",
  params: [
    { key: "q", label: "Search", type: "string", default: "", hint: "Partial match on name." },
    { key: "slug", label: "Slug", type: "string", default: "" },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      default: "",
      hint: "Your own application-specific identifier for the template.",
    },
    { key: "folder", label: "Folder", type: "string", default: "" },
    {
      key: "archived",
      label: "Archived Only",
      type: "boolean",
      default: false,
      hint: "List only archived templates instead of active ones.",
    },
    {
      key: "shared",
      label: "Shared With Test Mode",
      type: "boolean",
      default: false,
    },
    ...LIST_PARAMS,
  ],
  output: [{ key: "[]", type: "array", label: "Templates" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 10);

    ctx.log("info", "listing DocuSeal templates", { returnAll, limit });

    return await new DocuSealClient(ctx).requestAll("/templates", {
      query: {
        q: (p.q as string) || undefined,
        slug: (p.slug as string) || undefined,
        external_id: (p.externalId as string) || undefined,
        folder: (p.folder as string) || undefined,
        archived: p.archived === true ? true : undefined,
        shared: p.shared === true ? true : undefined,
      },
    }, returnAll ? Infinity : limit);
  },
};

export default templateList;
