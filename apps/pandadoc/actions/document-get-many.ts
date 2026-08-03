import type { ActionDefinition } from "@w6w/types";
import { PandaDocClient } from "../lib/client.ts";
import { paging, type PagingInput, resultsOutput } from "../lib/params.ts";

interface Input extends PagingInput {
  q?: string;
  status?: number;
  statusNe?: number;
  templateId?: string;
  formId?: string;
  folderUuid?: string;
  contactId?: string;
  membershipId?: string;
  tag?: string;
  orderBy?: string;
  createdFrom?: string;
  createdTo?: string;
  modifiedFrom?: string;
  modifiedTo?: string;
  completedFrom?: string;
  completedTo?: string;
  deleted?: boolean;
  id?: string;
}

/**
 * `GET /public/v1/documents` — the document list, with PandaDoc's full filter
 * surface.
 *
 * `status` is an INTEGER on this endpoint even though every other surface
 * (`document.draft`, `document.sent`, …) names statuses as strings — the
 * reference documents the range as 0–14. It is exposed as a plain number with
 * the mapping in the hint rather than a `select`, because PandaDoc has added
 * codes to that range over time and hard-coding today's list would silently
 * exclude tomorrow's.
 *
 * `template_id` and `form_id` are documented as mutually exclusive; sending
 * both is a 400 from PandaDoc, which surfaces as-is rather than being
 * second-guessed here.
 */
const documentGetMany: ActionDefinition<Input> = {
  key: "document-get-many",
  type: "search",
  resource: "document",
  title: "Get Many Documents",
  description:
    "List documents in the workspace, filtered by status, template, folder, contact, tag or date range.",
  params: [
    {
      key: "q",
      label: "Search",
      type: "string",
      hint: "Search by document name or reference number.",
    },
    {
      key: "status",
      label: "Status",
      type: "number",
      hint:
        "Numeric document status, 0–14 (0 draft, 1 sent, 2 completed, 5 viewed, 6 waiting approval, 7 approved, 8 rejected, 10 paid, 11 expired, 12 declined). PandaDoc extends this range over time.",
      validation: { min: 0, integer: true },
    },
    {
      key: "statusNe",
      label: "Status (exclude)",
      type: "number",
      hint: "Exclude documents in this numeric status.",
      validation: { min: 0, integer: true },
    },
    {
      key: "templateId",
      label: "Template ID",
      type: "string",
      hint: "Only documents created from this template. Mutually exclusive with Form ID.",
    },
    {
      key: "formId",
      label: "Form ID",
      type: "string",
      hint: "Only documents created from this form. Mutually exclusive with Template ID.",
    },
    { key: "folderUuid", label: "Folder UUID", type: "string" },
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      hint: "Only documents where this contact is a recipient or approver.",
    },
    {
      key: "membershipId",
      label: "Owner membership ID",
      type: "string",
      hint: "Only documents owned by this workspace member.",
    },
    { key: "tag", label: "Tag", type: "string" },
    {
      key: "orderBy",
      label: "Order by",
      type: "string",
      hint: "Field to sort by; prefix with `-` for descending, e.g. `-date_created`.",
    },
    { key: "createdFrom", label: "Created from", type: "datetime", hint: "Inclusive." },
    { key: "createdTo", label: "Created to", type: "datetime", hint: "Exclusive." },
    { key: "modifiedFrom", label: "Modified from", type: "datetime", hint: "Inclusive." },
    { key: "modifiedTo", label: "Modified to", type: "datetime", hint: "Exclusive." },
    { key: "completedFrom", label: "Completed from", type: "datetime", hint: "Inclusive." },
    { key: "completedTo", label: "Completed to", type: "datetime", hint: "Exclusive." },
    {
      key: "deleted",
      label: "Deleted only",
      type: "boolean",
      hint: "Return only deleted documents.",
    },
    { key: "id", label: "Document ID", type: "string", hint: "Search by a specific document id." },
    ...paging,
  ],
  output: resultsOutput,

  async execute(input, ctx) {
    return await new PandaDocClient(ctx).request("/documents", {
      query: {
        q: input.q,
        status: input.status,
        status__ne: input.statusNe,
        template_id: input.templateId,
        form_id: input.formId,
        folder_uuid: input.folderUuid,
        contact_id: input.contactId,
        membership_id: input.membershipId,
        tag: input.tag,
        order_by: input.orderBy,
        created_from: input.createdFrom,
        created_to: input.createdTo,
        modified_from: input.modifiedFrom,
        modified_to: input.modifiedTo,
        completed_from: input.completedFrom,
        completed_to: input.completedTo,
        deleted: input.deleted,
        id: input.id,
        count: input.count,
        page: input.page,
      },
    });
  },
};

export default documentGetMany;
