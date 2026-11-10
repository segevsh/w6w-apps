import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import connectionList from "../actions/connection-list.ts";

interface Params {
  accountId: string;
}

const pollAction: ActionDefinition = {
  ...connectionList,
  execute(input, ctx) {
    return connectionList.execute({
      accountId: String(input.accountId),
      count: typeof input.count === "number" ? input.count : undefined,
      offset: typeof input.offset === "number" ? input.offset : undefined,
      useCache: input.useCache === true,
    }, ctx);
  },
};

const trigger = pollFromListAction<Params>({
  key: "new-connection",
  title: "New Connection",
  description: "The run gets each connection newly added to the selected account.",
  action: pollAction,
  params: [{ key: "accountId", label: "Account ID", type: "string", required: true }],
  input: ({ accountId }) => ({ accountId, count: 100, offset: 0, useCache: true }),
  items: (result) => {
    const data = (result as { data?: unknown }).data;
    return Array.isArray(data) ? data : [];
  },
  idOf: (item) =>
    String((item as { id?: unknown; urn?: unknown }).id ?? (item as { urn?: unknown }).urn),
  output: [
    { key: "id", type: "string", label: "Connection ID" },
    { key: "name", type: "string", label: "Connection name" },
  ],
  sample: { id: "connection-1", name: "Avery Example" },
  maxPages: 1,
});

export default trigger;
