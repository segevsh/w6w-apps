import type { ActionDefinition } from "@w6w/types";
import { QuickbaseClient, resolveAppId } from "../lib/client.ts";

interface Input {
  appId?: string;
}

export interface QuickbaseTable {
  id?: string;
  name?: string;
  alias?: string;
  description?: string;
  created?: string;
  updated?: string;
  nextRecordId?: number;
  nextFieldId?: number;
  defaultSortFieldId?: number;
  defaultSortOrder?: string;
  keyFieldId?: number;
  singleRecordName?: string;
  pluralRecordName?: string;
  sizeLimit?: string;
  spaceUsed?: string;
  spaceRemaining?: string;
}

/**
 * `GET /tables?appId=…` — every table in an application.
 *
 * Note the shape of the route: tables are listed from `/tables` with the app as
 * a **query parameter**, not from `/apps/{appId}/tables`. The response is a bare
 * JSON array, not an envelope, so there is no pagination to walk.
 *
 * `appId` falls back to the Connection's default when omitted — see
 * `auth/user-token.ts` for why the connection carries one.
 *
 * `keyFieldId` in each entry is worth reading before writing: it is the field
 * `upsert-records` treats as the update key, and it is not always 3.
 */
const listTables: ActionDefinition<Input, QuickbaseTable[]> = {
  key: "list-tables",
  type: "read",
  resource: "table",
  title: "List Tables",
  description: "List every table in a Quickbase application.",
  params: [
    {
      key: "appId",
      label: "Application ID",
      type: "string",
      placeholder: "bqrxxxxxx",
      hint: "Defaults to the application recorded on the connection.",
    },
  ],
  output: [{ key: "tables", type: "array", label: "Tables" }],

  execute(input, ctx) {
    return new QuickbaseClient(ctx).request<QuickbaseTable[]>("tables", {
      query: { appId: resolveAppId(input.appId, ctx.connection) },
    });
  },
};

export default listTables;
