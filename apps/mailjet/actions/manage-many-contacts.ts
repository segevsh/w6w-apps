import type { ActionDefinition } from "@w6w/types";
import { MailjetClient, type MailjetEnvelope } from "../lib/client.ts";
import { SUBSCRIPTION_ACTIONS } from "./manage-contact-lists.ts";

interface Input {
  listId: number;
  action?: string;
  contacts: Array<{
    Email: string;
    Name?: string;
    Properties?: Record<string, unknown>;
  }>;
}

/**
 * Bulk-add contacts to one list — the right tool for an import, and an
 * **asynchronous** one.
 *
 * ## It returns a job, not a result
 *
 * The response is `{"Count": 1, "Data": [{"JobID": 35800}], "Total": 1}`. Mailjet
 * has accepted the upload, not finished it. Nothing here tells you whether the
 * contacts landed; that is what `get-contact-import-job` is for, and a workflow
 * that treats a 200 from this action as "imported" will be wrong for large
 * batches. This is the single most common way to misuse the endpoint, so both
 * this action's description and the README say it in as many words.
 *
 * ## The lowercase `action`
 *
 * This endpoint takes a **lowercase, top-level `action`** applying to the whole
 * batch — `{"action": "addnoforce", "contacts": [...]}` — where the
 * single-contact endpoint takes a capitalised per-list `Action`. Same four verbs,
 * different casing and different position. Mailjet's inconsistency, faithfully
 * reproduced; see `manage-contact-lists.ts` for why the two are separate actions.
 *
 * As there, the default is `addnoforce`, which respects an existing unsubscribe.
 * `addforce` "adds the contact and re-subscribes the contact to the list" — on a
 * bulk import that means overriding every opt-out in the file at once, which
 * should never be something a default does.
 *
 * ## Properties must already exist
 *
 * Per-contact `Properties` are accepted, but only for properties already defined
 * via the `/contactmetadata` resource, and only `static` ones. Mailjet rejects
 * the payload otherwise rather than creating them on the fly. Defining contact
 * metadata is not implemented in this app — see README.md "Not built".
 *
 * Re-uploading an address is safe: "multiple entries or subsequent uploads will
 * not add duplicate entries", and `Name`/`Properties` are updated in place, which
 * makes this the closest thing Mailjet offers to a bulk upsert.
 */
const manageManyContacts: ActionDefinition<Input> = {
  key: "manage-many-contacts",
  type: "perform",
  /** Per Mailjet, "multiple entries or subsequent uploads will not add duplicate entries" — a retry converges on the same membership (it does spawn a fresh JobID). */
  idempotent: true,
  resource: "contactslist",
  title: "Bulk Manage Contacts in a List",
  description: "Bulk add/unsubscribe/remove contacts on one list " +
    "(POST /v3/REST/contactslist/{id}/managemanycontacts). ASYNCHRONOUS: returns a `JobID`, not " +
    "a result — poll it with `get-contact-import-job`. Defaults to `addnoforce`.",
  params: [
    { key: "listId", label: "Contact list ID", type: "number", required: true },
    {
      key: "action",
      label: "Action",
      type: "select",
      default: "addnoforce",
      options: [...SUBSCRIPTION_ACTIONS],
      hint: "Applies to every contact in the batch. `addforce` overrides existing unsubscribes.",
    },
    {
      key: "contacts",
      label: "Contacts",
      type: "json",
      required: true,
      hint: 'JSON array of `{"Email": "a@x.com", "Name": "Ada", "Properties": {...}}`. ' +
        "`Email` is required per entry; any `Properties` must already be defined on the account.",
    },
  ],
  output: [
    {
      key: "Data",
      type: "array",
      label: "Job",
    },
  ],

  execute(input, ctx) {
    const client = new MailjetClient(ctx);
    return client.v3<MailjetEnvelope<{ JobID?: number }>>(
      `/contactslist/${encodeURIComponent(String(input.listId))}/managemanycontacts`,
      {
        method: "POST",
        body: { action: input.action ?? "addnoforce", contacts: input.contacts },
      },
    );
  },
};

export default manageManyContacts;
