import { sinceTrigger } from "../lib/since.ts";
import listBitlinks from "../actions/list-bitlinks.ts";
import type { Bitlink } from "../lib/client.ts";

export const PAGE_SIZE = 50;

interface Params {
  groupGuid?: string;
}

export default sinceTrigger<Bitlink, Params>({
  key: "new-bitlink",
  title: "New Bitlink",
  description: "The run gets each newly created Bitlink in a group.",
  params: [
    {
      key: "groupGuid",
      label: "Group GUID",
      type: "string",
      required: true,
      hint: "See List Groups for the account's group GUIDs.",
    },
  ],
  async fetchPage(sinceMs, _page, ctx, params, token) {
    const res = await listBitlinks.execute({
      groupGuid: params.groupGuid ?? "",
      createdAfter: Math.floor(sinceMs / 1000),
      size: PAGE_SIZE,
      searchAfter: token,
    }, ctx);
    return { items: res.items ?? [], more: !!res.nextSearchAfter, next: res.nextSearchAfter };
  },
  idOf: (b) => b.id,
  output: [
    { key: "id", type: "string", label: "Bitlink ID" },
    { key: "link", type: "string", label: "Short link" },
    { key: "long_url", type: "string", label: "Long URL" },
    { key: "title", type: "string", label: "Title" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "bit.ly/3xYz9Ab",
    link: "https://bit.ly/3xYz9Ab",
    long_url: "https://example.com/launch",
    title: "Launch page",
    created_at: "2026-11-09T09:00:00+0000",
  },
});
