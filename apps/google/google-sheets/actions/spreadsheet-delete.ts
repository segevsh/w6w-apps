import type { ActionDefinition } from "@w6w/types";
import { GoogleSheetsClient } from "../lib/client.ts";
import { SPREADSHEET_ID } from "../lib/params.ts";

interface Input {
  spreadsheetId: string;
}

/**
 * Deleting a spreadsheet actually deletes the underlying Drive file —
 * Google routes this through the Drive API, not Sheets. Requires the
 * `drive.file` scope (i.e. the file must have been created by this app or
 * explicitly opened via a Drive picker).
 */
const spreadsheetDelete: ActionDefinition<Input> = {
  key: "spreadsheet-delete",
  type: "perform",
  resource: "spreadsheet",
  title: "Delete Spreadsheet",
  description: "Permanently delete a Google spreadsheet (via the Drive API).",
  idempotent: false,
  params: [
    SPREADSHEET_ID,
  ],

  async execute(input, ctx) {
    const client = new GoogleSheetsClient(ctx);
    await client.request(`/drive/v3/files/${encodeURIComponent(input.spreadsheetId)}`, {
      method: "DELETE",
    });
    return { success: true };
  },
};

export default spreadsheetDelete;
