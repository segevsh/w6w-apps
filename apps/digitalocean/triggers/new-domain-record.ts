import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import domainRecordList from "../actions/domain-record-list.ts";

/**
 * Snapshot poll (brief 9.1 c). `domain-record-list` has no sort argument and DigitalOcean caps a
 * page at 200, so the whole record set of one domain is watched as a snapshot instead. A domain
 * with more than 200 records is refused loudly rather than silently missing the later pages.
 */
const trigger: TriggerDefinition = {
  key: "new-domain-record",
  title: "New DNS Record",
  description: "The run gets each DNS record newly added to the domain.",
  params: (domainRecordList.params ?? []).filter((p) => p.key === "domain"),
  output: [
    { key: "id", type: "number", label: "DNS record ID" },
    { key: "type", type: "string", label: "Record type" },
    { key: "name", type: "string", label: "Relative name" },
    { key: "qualifiedName", type: "string", label: "Fully-qualified name" },
    { key: "data", type: "string", label: "Record data" },
    { key: "ttl", type: "number", label: "TTL (seconds)" },
  ],
  sample: {
    id: 3352896,
    type: "A",
    name: "www",
    qualifiedName: "www.example.com",
    data: "203.0.113.10",
    ttl: 1800,
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const res = await domainRecordList.execute(
      { domain: String(params.domain ?? ""), perPage: 200 },
      ctx,
    ) as { records?: Array<Record<string, unknown>>; count?: number; total?: number };
    const records = res.records ?? [];
    if (typeof res.total === "number" && res.total > records.length) {
      throw new Error(
        `domain has ${res.total} records but one page holds ${records.length}: ` +
          "the new-domain-record trigger watches at most 200 records per domain",
      );
    }
    const { events, nextState } = await pollSnapshot({
      state,
      emit: { added: true, updated: false },
      rows: records.map((r) => ({ key: String(r.id), values: r })),
    });
    return { events: events.map((e) => e.values), nextState };
  },
};

export default trigger;
