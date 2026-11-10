import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import dnsRecordList from "../actions/dns-record-list.ts";

/** Cloudflare documents `per_page` up to 5,000,000; a zone's whole record set is one request. */
export const PER_PAGE = 5000;

interface Params {
  zoneId?: string;
  type?: string;
}

interface DnsRecord {
  id?: string;
}

const trigger: TriggerDefinition<Params> = {
  key: "new-dns-record",
  title: "New DNS Record",
  description: "The run gets each DNS record newly added to a zone.",
  params: [
    { key: "zoneId", label: "Zone ID", type: "string", required: true, hint: "The zone's ID" },
    {
      key: "type",
      label: "Record Type",
      type: "string",
      hint: "Only records of this type, e.g. A or CNAME. Leave empty for all.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Record ID" },
    { key: "type", type: "string", label: "Record type" },
    { key: "name", type: "string", label: "Record name" },
    { key: "content", type: "string", label: "Content" },
    { key: "proxied", type: "boolean", label: "Proxied" },
    { key: "created_on", type: "string", label: "Created on" },
  ],
  sample: {
    id: "372e67954025e0ba6aaa6d586b9e0b59",
    type: "A",
    name: "app.example.com",
    content: "198.51.100.4",
    proxied: true,
    created_on: "2026-11-09T09:00:00Z",
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const records = await dnsRecordList.execute(
      { zoneId: params.zoneId ?? "", type: params.type ?? "", perPage: PER_PAGE, page: 1 },
      ctx,
    ) as DnsRecord[];
    const list = Array.isArray(records) ? records : [];
    const byId = new Map(list.map((r) => [String(r.id), r]));
    const { events, nextState } = await pollSnapshot({
      state,
      rows: list.map((r) => ({ key: String(r.id), values: { id: r.id } })),
      emit: { added: true },
      maxRows: PER_PAGE,
    });
    return { events: events.map((e) => byId.get(e.key)), nextState };
  },
};

export default trigger;
