import type { ActionDefinition } from "@w6w/types";
import { compact, DocumensoClient } from "../lib/client.ts";

/**
 * `POST /folder/create` — verified against Documenso's v2 OpenAPI document
 * (required `name`).
 *
 * The `type` is fixed at creation and decides what the folder can hold —
 * documents or templates. Getting it wrong is not fatal but is not fixable
 * either: envelopes of the other kind simply cannot be filed there.
 */
const action: ActionDefinition = {
  key: "folder-create",
  type: "perform",
  resource: "folder",
  title: "Create a folder",
  description: "Create a folder for documents or for templates.",
  // Documenso allows two folders with the same name.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, default: "" },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      default: "DOCUMENT",
      options: [
        { value: "DOCUMENT", label: "Documents" },
        { value: "TEMPLATE", label: "Templates" },
      ],
      hint: "Fixed at creation — a document folder cannot later hold templates.",
    },
    {
      key: "parentId",
      label: "Parent Folder ID",
      type: "string",
      default: "",
      hint: "Blank creates it at the top level.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Folder id" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "DOCUMENT or TEMPLATE" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    ctx.log("info", "creating a Documenso folder", { name });

    return await new DocumensoClient(ctx).request("/folder/create", {
      method: "POST",
      body: compact({
        name,
        type: String(p.type ?? "DOCUMENT"),
        parentId: p.parentId,
      }),
    });
  },
};

export default action;
