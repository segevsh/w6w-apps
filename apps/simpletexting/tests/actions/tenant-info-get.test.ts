import { assertEquals } from "@std/assert";
import tenantInfoGet from "../../actions/tenant-info-get.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("tenant-info-get: reads the tenant endpoint with nothing in the way", async () => {
  const { ctx, calls } = mockCtx([{ body: { email: "owner@example.com" } }]);
  const result = await tenantInfoGet.execute({}, ctx) as { email: string };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/api/tenant`);
  assertEquals(calls[0].body, null);
  assertEquals(result.email, "owner@example.com");
});

Deno.test("tenant-info-get: declares no params, so a host can invoke it with {}", () => {
  assertEquals(tenantInfoGet.params, []);
});

Deno.test("tenant-info-get: carries no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { email: "owner@example.com" } }]);
  await tenantInfoGet.execute({}, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});
