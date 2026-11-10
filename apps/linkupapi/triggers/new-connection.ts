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
  description:
    "The run gets each connection newly accepted on the selected account (needs the account subscribed to the accepted_invitation webhook event, which fills the stored copy this reads).",
  action: pollAction,
  params: [{ key: "accountId", label: "Account ID", type: "string", required: true }],
  input: ({ accountId }) => ({ accountId, count: 100, offset: 0, useCache: true }),
  items: (result) => {
    const data = (result as { data?: { connections?: unknown } }).data;
    return Array.isArray(data?.connections) ? data.connections : [];
  },
  idOf: (item) => String((item as { profile_url?: unknown }).profile_url ?? ""),
  output: [
    { key: "name", type: "string", label: "Connection name" },
    { key: "job_title", type: "string", label: "Headline" },
    { key: "profile_url", type: "string", label: "Profile URL" },
    { key: "profile_picture", type: "string", label: "Profile picture URL" },
  ],
  sample: {
    name: "Avery Example",
    job_title: "Head of Growth",
    profile_url: "/in/avery-example",
    profile_picture: "/media/avery.jpg",
  },
  minIntervalMs: 900_000,
  maxPages: 1,
});

export default trigger;
