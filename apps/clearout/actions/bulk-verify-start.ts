import type { ActionDefinition } from "@w6w/types";
import { ClearoutClient, splitList } from "../lib/client.ts";

interface Input {
  emails?: string;
  file?: unknown;
  optimize?: string;
  ignoreDuplicateFile?: boolean;
}

/**
 * `POST /email_verify/bulk` (multipart). The vendor wants a file with a column headed
 * `Email` (`Emails`, `Email address` and `Emailaddress` also work; otherwise error 1004).
 * Either pass `emails` and the app writes that CSV, or upload your own file (CSV/XLSX).
 * The response is only the `list_id`: poll `bulk-verify-status`, then fetch the result URL.
 */
const bulkVerifyStart: ActionDefinition<Input> = {
  key: "bulk-verify-start",
  type: "perform",
  idempotent: false,
  resource: "bulk-list",
  title: "Start Bulk Verify",
  description: "Upload a list of emails (or a CSV/XLSX file) for bulk verification. Returns a " +
    "list ID to poll with Get Bulk Verify Progress. Costs a credit per address.",
  params: [
    {
      key: "emails",
      label: "Emails",
      type: "text",
      hint: "One address per line (commas and spaces also separate). Ignored when a file is given.",
    },
    { key: "file", label: "File", type: "file", hint: "A CSV/XLSX with an `Email` column." },
    {
      key: "optimize",
      label: "Optimize for",
      type: "select",
      default: "highest_accuracy",
      options: [
        { value: "highest_accuracy", label: "Highest accuracy" },
        { value: "fastest_turnaround", label: "Fastest turnaround" },
      ],
    },
    {
      key: "ignoreDuplicateFile",
      label: "Allow a duplicate file",
      type: "boolean",
      hint: "Upload even when a file with the same name and size was uploaded recently.",
    },
  ],
  output: [{ key: "listId", type: "string", label: "List ID" }],

  async execute(input, ctx) {
    const form = new FormData();
    if (input.file) {
      form.append("file", input.file as Blob);
    } else {
      const emails = splitList(input.emails);
      if (emails.length === 0) throw new Error("provide emails or a file");
      form.append(
        "file",
        new Blob([`Email\n${emails.join("\n")}\n`], { type: "text/csv" }),
        "emails.csv",
      );
    }
    if (input.optimize) form.append("optimize", input.optimize);
    if (input.ignoreDuplicateFile) form.append("ignore_duplicate_file", "true");
    const { data } = await new ClearoutClient(ctx).request("/email_verify/bulk", { form });
    return { listId: (data as { list_id?: string } | undefined)?.list_id };
  },
};

export default bulkVerifyStart;
