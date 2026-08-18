import type { ActionDefinition } from "@w6w/types";
import { DocumensoClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /envelope` — verified against Documenso's v2 OpenAPI document
 * (`envelope-find`).
 *
 * **Templates and documents live in the same collection.** An envelope's `type`
 * distinguishes them, so an unfiltered list of "documents" quietly includes
 * every template — the same shape as Gitea returning pull requests among its
 * issues. The filter defaults to real documents here for that reason.
 */
const action: ActionDefinition = {
  key: "envelope-find",
  type: "read",
  resource: "envelope",
  title: "Find envelopes",
  description: "List envelopes — documents by default, or templates.",
  params: [
    {
      key: "type",
      label: "Type",
      type: "select",
      default: "DOCUMENT",
      options: [
        { value: "DOCUMENT", label: "Documents" },
        { value: "TEMPLATE", label: "Templates" },
        { value: "", label: "Both — templates are envelopes too" },
      ],
      hint: "Unfiltered, templates appear alongside documents.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Any" },
        { value: "DRAFT", label: "Draft — created, not sent" },
        { value: "PENDING", label: "Pending — sent, awaiting signatures" },
        { value: "COMPLETED", label: "Completed" },
        { value: "REJECTED", label: "Rejected" },
      ],
    },
    { key: "query", label: "Search", type: "string", default: "" },
    { key: "folderId", label: "Folder ID", type: "string", default: "" },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    // The host applies `default`, but a bare execute() call does not.
    const type = p.type === undefined ? "DOCUMENT" : String(p.type);

    ctx.log("info", "finding Documenso envelopes", { type, returnAll, limit });

    return await new DocumensoClient(ctx).requestAll("/envelope", {
      query: {
        type: type || undefined,
        status: (p.status as string) || undefined,
        query: (p.query as string) || undefined,
        folderId: (p.folderId as string) || undefined,
      },
    }, returnAll ? Infinity : limit);
  },
};

export default action;
