import type { ActionDefinition } from "@w6w/types";
import { cfFetch } from "../lib/client.ts";

/**
 * Delete a DNS record from a zone.
 * `DELETE /zones/{zone_id}/dns_records/{dns_record_id}` —
 * https://developers.cloudflare.com/api/resources/dns/subresources/records/methods/delete/
 */
const action: ActionDefinition = {
  key: "dns-record-delete",
  type: "perform",
  resource: "dns-record",
  title: "Delete a DNS record",
  description: "Permanently remove a DNS record from a zone",
  idempotent: true,
  params: [
    {
      key: "zoneId",
      label: "Zone ID",
      type: "string",
      required: true,
      default: "",
      hint: "The zone's ID",
    },
    {
      key: "dnsRecordId",
      label: "DNS Record ID",
      type: "string",
      required: true,
      default: "",
      hint: "ID of the DNS record, from List DNS Records",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const zoneId = String(p.zoneId ?? "").trim();
    const dnsRecordId = String(p.dnsRecordId ?? "").trim();
    if (!zoneId) throw new Error("`zoneId` is required");
    if (!dnsRecordId) throw new Error("`dnsRecordId` is required");

    ctx.log("info", "deleting Cloudflare DNS record", { zoneId, dnsRecordId });

    const { result } = await cfFetch(
      ctx,
      `/zones/${encodeURIComponent(zoneId)}/dns_records/${encodeURIComponent(dnsRecordId)}`,
      { method: "DELETE" },
    );
    return result;
  },
};

export default action;
