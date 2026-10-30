import { test } from "node:test";
import { assertEquals, assertRejects, assertStringIncludes } from "../_assert.ts";
import { cfOk, mockCtx } from "../_helpers.ts";
import action from "../../actions/dns-record-list.ts";

test("dns-record-list: GETs /zones/{id}/dns_records", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: cfOk([{ id: "r1", type: "A", name: "example.com", content: "1.2.3.4" }]) },
  ]);
  const result = await action.execute!({ zoneId: "z1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertStringIncludes(calls[0].url, "https://api.cloudflare.com/client/v4/zones/z1/dns_records?");
  assertEquals(result, [{ id: "r1", type: "A", name: "example.com", content: "1.2.3.4" }]);
});

test("dns-record-list: filters by type and name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: cfOk([]) }]);
  await action.execute!({ zoneId: "z1", type: "A", name: "www.example.com" }, ctx);

  assertStringIncludes(calls[0].url, "type=A");
  assertStringIncludes(calls[0].url, "name=www.example.com");
});

test("dns-record-list: missing zoneId rejects", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ zoneId: "" }, ctx),
    Error,
    "`zoneId`",
  );
});
