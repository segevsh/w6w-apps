import type { ActionDefinition } from "@w6w/types";
import { USER, WakaClient } from "../lib/client.ts";

type Input = Record<string, never>;

/** `GET /api/v1/users/current/data_dumps` */
const dataDumpList: ActionDefinition<Input> = {
  key: "data-dump-list",
  type: "read",
  resource: "data-dump",
  title: "List Data Exports",
  description:
    "The user's data exports and their status; a finished export carries a download_url.",
  params: [],
  output: [
    { key: "data", type: "array", label: "Data exports" },
  ],

  execute(_input, ctx) {
    return new WakaClient(ctx).request("GET", `${USER}/data_dumps`);
  },
};

export default dataDumpList;
