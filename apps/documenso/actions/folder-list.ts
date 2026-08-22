import type { ActionDefinition } from "@w6w/types";
import { DocumensoClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /folder` — verified against Documenso's v2 OpenAPI document
 * (`folder-findFolders`).
 *
 * Folders are how envelopes are filed, and they are **typed**: a folder holds
 * documents or templates, not both. So `envelope-use` filing a new document
 * into a template folder is a mismatch the API refuses.
 */
const action: ActionDefinition = {
  key: "folder-list",
  type: "read",
  resource: "folder",
  title: "List folders",
  description: "List folders — the ids envelopes are filed into.",
  params: [
    {
      key: "type",
      label: "Type",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Any" },
        { value: "DOCUMENT", label: "Document folders" },
        { value: "TEMPLATE", label: "Template folders" },
      ],
      hint: "A folder holds documents or templates, not both.",
    },
    {
      key: "parentId",
      label: "Parent Folder ID",
      type: "string",
      default: "",
      hint: "Blank lists the top level.",
    },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Documenso folders", { returnAll, limit });

    return await new DocumensoClient(ctx).requestAll("/folder", {
      query: {
        type: (p.type as string) || undefined,
        parentId: (p.parentId as string) || undefined,
      },
    }, returnAll ? Infinity : limit);
  },
};

export default action;
