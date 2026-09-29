import type { ActionDefinition } from "@w6w/types";
import { asJsonOptional, compact, DocuSealClient } from "../lib/client.ts";

/**
 * `POST /templates/html` — verified against DocuSeal's OpenAPI document
 * (`createTemplateFromHtml`, `CreateTemplateFromHtmlRequest`). Builds a
 * template from an HTML fragment carrying DocuSeal's own field tags (e.g.
 * `<text-field name="..." role="...">`), documented at
 * https://www.docuseal.com/guides/create-pdf-document-fillable-form-with-html-api.
 *
 * Passing `externalId` for an ID that already names a template **updates**
 * that template with the new HTML rather than creating a second one — the
 * spec states this explicitly, so this action is not idempotent by default
 * (a caller relying on that upsert behavior gets it, but a bare retry with no
 * `externalId` creates a duplicate).
 */
const templateCreateFromHtml: ActionDefinition = {
  key: "template-create-from-html",
  type: "perform",
  resource: "template",
  title: "Create Template From HTML",
  description: "Build a document template from an HTML fragment with field tags.",
  idempotent: false,
  params: [
    {
      key: "html",
      label: "HTML",
      type: "text",
      default: "",
      hint: 'HTML with DocuSeal field tags, e.g. <text-field name="Name" role="First Party">. ' +
        "Leave blank when using Documents instead for a multi-document template.",
    },
    { key: "htmlHeader", label: "HTML Header", type: "text", default: "" },
    { key: "htmlFooter", label: "HTML Footer", type: "text", default: "" },
    { key: "name", label: "Name", type: "string", default: "" },
    {
      key: "size",
      label: "Page Size",
      type: "select",
      default: "Letter",
      options: [
        { value: "Letter", label: "Letter" },
        { value: "Legal", label: "Legal" },
        { value: "Tabloid", label: "Tabloid" },
        { value: "Ledger", label: "Ledger" },
        { value: "A0", label: "A0" },
        { value: "A1", label: "A1" },
        { value: "A2", label: "A2" },
        { value: "A3", label: "A3" },
        { value: "A4", label: "A4" },
        { value: "A5", label: "A5" },
        { value: "A6", label: "A6" },
      ],
    },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      default: "",
      hint: "An existing template with this id is updated with the new HTML instead of creating " +
        "a second one.",
    },
    { key: "folderName", label: "Folder Name", type: "string", default: "" },
    {
      key: "sharedLink",
      label: "Shared Link",
      type: "boolean",
      default: true,
      hint: "Make the template available via a shared link.",
    },
    {
      key: "documents",
      label: "Documents",
      type: "json",
      default: "",
      hint: "A JSON array to build several documents in one template, e.g. " +
        '[{"name":"Page 1","html":"<p>...</p>"}]. Leave the top-level HTML field empty when using this.',
    },
  ],
  output: [
    { key: "id", type: "number", label: "New template id" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "name", type: "string", label: "Name" },
    { key: "fields", type: "array", label: "Fields parsed out of the field tags" },
    { key: "documents", type: "array", label: "The documents in the template" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    ctx.log("info", "creating a DocuSeal template from HTML", { name: p.name });

    return await new DocuSealClient(ctx).request("/templates/html", {
      method: "POST",
      body: compact({
        html: p.html,
        html_header: p.htmlHeader,
        html_footer: p.htmlFooter,
        name: p.name,
        size: p.size,
        external_id: p.externalId,
        folder_name: p.folderName,
        shared_link: p.sharedLink === false ? false : undefined,
        documents: asJsonOptional<unknown[]>(p.documents, "documents"),
      }),
    });
  },
};

export default templateCreateFromHtml;
