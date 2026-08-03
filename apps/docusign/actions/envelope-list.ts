import type { ActionDefinition } from "@w6w/types";
import { DocusignClient } from "../lib/client.ts";
import { ENVELOPE_STATUSES, envelopeListOutput, paging, type PagingInput } from "../lib/params.ts";

interface Input extends PagingInput {
  fromDate?: string;
  toDate?: string;
  status?: string;
  envelopeIds?: string;
  folderIds?: string;
  searchText?: string;
  orderBy?: string;
  order?: string;
  include?: string;
  userId?: string;
}

/**
 * `GET /restapi/v2.1/accounts/{accountId}/envelopes` — `Envelopes:
 * listStatusChanges`, Docusign's envelope search.
 *
 * **`from_date` is conditionally required and the API will tell you so.**
 * Docusign documents it as "required unless `envelopeIds` or `transactionIds`
 * are set", which is a rule a static `required: true` cannot express — so the
 * param is optional here and a request that satisfies neither branch comes back
 * as Docusign's own 400 rather than a guess made locally. `envelope_ids` also
 * accepts the literal `request_body`, which this app does not use: that mode
 * moves the id list into a request body on a GET, and the comma-separated query
 * form covers every list a workflow realistically passes.
 *
 * `folder_ids` takes folder GUIDs *or* Docusign's named pseudo-folders
 * (`inbox`, `sentitems`, `draft`, `completed`, `awaiting_my_signature`,
 * `out_for_signature`, `waiting_for_others`, `expiring_soon`, `recyclebin`),
 * which is usually what a workflow actually wants.
 */
const envelopeList: ActionDefinition<Input> = {
  key: "envelope-list",
  type: "search",
  resource: "envelope",
  title: "List Envelopes",
  description:
    "Search envelopes by date range, status, folder or free text. Docusign requires a From date unless you pass explicit envelope IDs.",
  params: [
    {
      key: "fromDate",
      label: "From date",
      type: "datetime",
      hint:
        "Start of the status-change window. Required by Docusign unless Envelope IDs is set. ISO 8601 with an explicit offset is recommended — without one Docusign uses the server's time zone.",
    },
    { key: "toDate", label: "To date", type: "datetime", hint: "End of the window." },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: `Comma-separated list of envelope statuses: ${ENVELOPE_STATUSES.join(", ")}.`,
    },
    {
      key: "envelopeIds",
      label: "Envelope IDs",
      type: "string",
      hint: "Comma-separated envelope GUIDs. Supplying this makes From date optional.",
    },
    {
      key: "folderIds",
      label: "Folder IDs",
      type: "string",
      hint:
        "Comma-separated folder GUIDs, or Docusign's named folders: awaiting_my_signature, completed, draft, drafts, expiring_soon, inbox, out_for_signature, recyclebin, sentitems, waiting_for_others.",
    },
    { key: "searchText", label: "Search text", type: "string", hint: "Free-text filter." },
    {
      key: "orderBy",
      label: "Order by",
      type: "string",
      hint:
        "One of: last_modified, action_required, created, completed, envelope_name, expire, sent, signer_list, status, subject, user_name, status_changed.",
    },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
      ],
    },
    {
      key: "include",
      label: "Include",
      type: "string",
      hint:
        "Comma-separated extras: custom_fields, documents, attachments, extensions, folders, recipients, payment_tabs.",
    },
    {
      key: "userId",
      label: "User ID",
      type: "string",
      hint: "Only envelopes for this user id.",
    },
    ...paging,
  ],
  output: envelopeListOutput,

  execute(input, ctx) {
    return new DocusignClient(ctx).request("/envelopes", {
      query: {
        from_date: input.fromDate,
        to_date: input.toDate,
        status: input.status,
        envelope_ids: input.envelopeIds,
        folder_ids: input.folderIds,
        search_text: input.searchText,
        order_by: input.orderBy,
        order: input.order,
        include: input.include,
        user_id: input.userId,
        count: input.count,
        start_position: input.startPosition,
      },
    });
  },
};

export default envelopeList;
