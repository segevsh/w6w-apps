import type { ActionDefinition } from "@w6w/types";
import { call, listResult, pick } from "../lib/client.ts";
import { cursorParam, listOutput, select, str } from "../lib/params.ts";

/** `GET /lyro/data-sources`. */
type Input = { cursor?: string; kind?: string; parent_id?: string; order?: string };

const lyroDataSourceList: ActionDefinition<Input> = {
  key: "lyro-data-source-list",
  type: "read",
  resource: "lyro",
  title: "List Lyro Data Sources",
  description:
    "List the knowledge data sources the Lyro AI Agent uses (Q&A items and folders), newest first by default.",
  params: [
    select("kind", "Kind", ["qa", "folder"], { hint: "Leave empty for both." }),
    str("parent_id", "Parent folder ID", { hint: "Only direct children of this folder (UUID)." }),
    select("order", "Order by updated_at", ["asc", "desc"], { default: "desc" }),
    cursorParam,
  ],
  output: listOutput("Data sources [{id, parent_id, title, type, kind, status, content, ...}]"),
  async execute(input, ctx) {
    const body = await call(ctx, "GET", "/lyro/data-sources", {
      query: pick(input, ["cursor", "kind", "parent_id", "order"]) as never,
    });
    return listResult(body, "data_sources");
  },
};

export default lyroDataSourceList;
