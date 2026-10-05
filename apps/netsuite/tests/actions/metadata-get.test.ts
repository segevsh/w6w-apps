import { assertEquals } from "@std/assert";
import metadataGet from "../../actions/metadata-get.ts";
import { BASE, mockCtx, run } from "../_helpers.ts";

Deno.test("metadata-get: no type lists the catalog", async () => {
  const cat = { items: [{ name: "account", links: [] }] };
  const { ctx, calls } = mockCtx([{ body: cat }]);
  const out = await run(metadataGet, {}, ctx);
  assertEquals(calls[0].url, `${BASE}/services/rest/record/v1/metadata-catalog`);
  assertEquals(out, { metadata: cat });
});

Deno.test("metadata-get: a type asks for its JSON Schema via the Accept header", async () => {
  const { ctx, calls } = mockCtx([{ body: { type: "object", properties: {} } }]);
  const out = await run(metadataGet, { recordType: "customer" }, ctx);
  assertEquals(calls[0].url, `${BASE}/services/rest/record/v1/metadata-catalog/customer`);
  assertEquals(calls[0].headers["accept"], "application/schema+json");
  assertEquals(out, { metadata: { type: "object", properties: {} } });
});
