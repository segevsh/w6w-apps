import type { ActionDefinition } from "@w6w/types";
import { API_PREFIX, encodeId, RingCentralClient } from "../lib/client.ts";
import { accountIdParam, directoryEntryTypeOptions } from "../lib/params.ts";

/**
 * `GET /restapi/v1.0/account/{accountId}/directory/entries` — the Company
 * Directory: contact information for the account's own internal users (and,
 * when `showFederated` is left at its vendor default of `true`, every account
 * in the same federation).
 *
 * Needs only `ReadAccounts` (app permission) — the operation documents no
 * `x-user-permission` at all, unlike almost everything else in this app.
 *
 * `perPage` here has a different ceiling than the other list actions:
 * RingCentral documents this endpoint's maximum as 2000 (vs. 1000 elsewhere)
 * and additionally accepts the keywords `"max"`/`"all"` — this app only ever
 * sends a number, leaving those keywords unreachable rather than mixing types
 * on one field.
 */
interface Input {
  accountId?: string;
  type?: string;
  page?: number;
  perPage?: number;
}

const directoryEntriesList: ActionDefinition<Input> = {
  key: "directory-entries-list",
  type: "search",
  resource: "directory",
  title: "List Company Directory Entries",
  description:
    "List internal corporate contacts (the Company Directory) — not the personal address book.",
  params: [
    accountIdParam,
    {
      key: "type",
      label: "Extension type",
      type: "select",
      options: directoryEntryTypeOptions,
      hint: "Leave empty to return every type.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1 },
      hint: "1-indexed page number.",
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      default: 1000,
      validation: { integer: true, min: 1, max: 2000 },
      hint: "RingCentral's own default and this endpoint's maximum is 1000; ceiling is 2000.",
    },
  ],
  output: [
    { key: "records", type: "array", label: "Directory entries" },
    { key: "paging", type: "object", label: "page / perPage / totalPages / totalElements" },
  ],

  execute(input, ctx) {
    return new RingCentralClient(ctx).request(
      `${API_PREFIX}/account/${encodeId(input.accountId)}/directory/entries`,
      { query: { type: input.type, page: input.page, perPage: input.perPage } },
    );
  },
};

export default directoryEntriesList;
