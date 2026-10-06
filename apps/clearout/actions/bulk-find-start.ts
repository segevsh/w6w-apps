import type { ActionDefinition } from "@w6w/types";
import { ClearoutClient } from "../lib/client.ts";

interface Input {
  file: unknown;
  ignoreDuplicateFile?: boolean;
}

/**
 * `POST /email_finder/bulk` (multipart, `file` required). The docs' required columns are
 * a name column and a domain-or-company column; the app does not build the file because
 * the exact header spelling the parser matches is not stated in the API reference.
 */
const bulkFindStart: ActionDefinition<Input> = {
  key: "bulk-find-start",
  type: "perform",
  idempotent: false,
  resource: "bulk-list",
  title: "Start Bulk Find",
  description: "Upload a CSV/XLSX of names and company domains for bulk email finding. Returns " +
    "a list ID to poll with Get Bulk Find Progress. Costs a credit per address found.",
  params: [
    {
      key: "file",
      label: "File",
      type: "file",
      required: true,
      hint: "CSV/XLSX with a Name column and a Domain/Company column.",
    },
    { key: "ignoreDuplicateFile", label: "Allow a duplicate file", type: "boolean" },
  ],
  output: [{ key: "listId", type: "string", label: "List ID" }],

  async execute(input, ctx) {
    if (!input.file) throw new Error("file is required");
    const form = new FormData();
    form.append("file", input.file as Blob);
    if (input.ignoreDuplicateFile) form.append("ignore_duplicate_file", "true");
    const { data } = await new ClearoutClient(ctx).request("/email_finder/bulk", { form });
    return { listId: (data as { list_id?: string } | undefined)?.list_id };
  },
};

export default bulkFindStart;
