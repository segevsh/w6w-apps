import { assertEquals, assertRejects } from "@std/assert";
import { cfOk, mockCtx } from "../_helpers.ts";
import action from "../../actions/dns-record-delete.ts";

Deno.test("dns-record-delete: DELETEs /zones/{id}/dns_records/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: cfOk({ id: "r1" }) }]);
  const result = await action.execute!({ zoneId: "z1", dnsRecordId: "r1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.cloudflare.com/client/v4/zones/z1/dns_records/r1");
  assertEquals(result, { id: "r1" });
});

Deno.test("dns-record-delete: missing zoneId rejects", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ zoneId: "", dnsRecordId: "r1" }, ctx),
    Error,
    "`zoneId`",
  );
});

Deno.test("dns-record-delete: missing dnsRecordId rejects", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ zoneId: "z1", dnsRecordId: "" }, ctx),
    Error,
    "`dnsRecordId`",
  );
});
