import type { ActionDefinition } from "@w6w/types";
import { MailjetClient, type MailjetEnvelope } from "../lib/client.ts";

interface Input {
  listId: number;
  jobId: number;
}

/**
 * Poll a bulk contact import started by `manage-many-contacts`.
 *
 * Without this, `manage-many-contacts` is unusable in a workflow that needs to
 * know whether the import worked: that action returns a `JobID` the instant
 * Mailjet queues the upload, and everything interesting happens afterwards.
 *
 * `Status` is a seven-value vocabulary, quoted from Mailjet's contacts guide:
 *
 *   - `Allocated` — "the job is in the queue"
 *   - `Upload` — "The data is in the upload phase"
 *   - `Prepare` — "The data is being formatted to be added to the list"
 *   - `Importing` — "Data is being added to the Contact List"
 *   - `Completed` — "Addition to the Contact List complete"
 *   - `Error` — "Declares an error"
 *   - `Abort` — "For cancelled jobs"
 *
 * Only `Completed` means done, and only `Error`/`Abort` are terminal failures —
 * the other four are all "still running", which is why a workflow polls rather
 * than checking once. `Count` is progress, not a total: "the number of contacts
 * already processed by the background job". On `Error`, `ErrorFile` carries a URL
 * to a downloadable report; this action surfaces the URL and deliberately does
 * not fetch it, since that host is not on the app's egress allowlist.
 *
 * Note the path segment is `ManageManyContacts` in Mailjet's own example for the
 * GET, against lowercase `managemanycontacts` for the POST. Mailjet's REST
 * resource names are case-insensitive; this action sends the casing their
 * documented GET example uses.
 */
const getContactImportJob: ActionDefinition<Input> = {
  key: "get-contact-import-job",
  type: "read",
  resource: "contactslist",
  title: "Get Contact Import Job",
  description: "Poll a bulk import started by `manage-many-contacts` " +
    "(GET /v3/REST/contactslist/{id}/ManageManyContacts/{jobId}). `Status` is `Completed` only " +
    "when done; `Allocated`/`Upload`/`Prepare`/`Importing` all mean still running.",
  params: [
    { key: "listId", label: "Contact list ID", type: "number", required: true },
    {
      key: "jobId",
      label: "Job ID",
      type: "number",
      required: true,
      hint: "The `JobID` returned by `manage-many-contacts`.",
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
    return client.v3<
      MailjetEnvelope<{
        Status?: string;
        JobStart?: string;
        JobEnd?: string;
        Count?: number;
        Error?: string;
        ErrorFile?: string;
      }>
    >(
      `/contactslist/${encodeURIComponent(String(input.listId))}/ManageManyContacts/${
        encodeURIComponent(String(input.jobId))
      }`,
    );
  },
};

export default getContactImportJob;
