import { assertEquals, assertRejects } from "@std/assert";
import { cfOk, mockCtx } from "../_helpers.ts";
import action from "../../actions/zone-get.ts";

Deno.test("zone-get: GETs /zones/{id}", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: cfOk({ id: "z1", name: "example.com" }) },
  ]);
  const result = await action.execute!({ zoneId: "z1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.cloudflare.com/client/v4/zones/z1");
  assertEquals(result, { id: "z1", name: "example.com" });
});

Deno.test("zone-get: missing zoneId rejects", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ zoneId: "" }, ctx),
    Error,
    "`zoneId`",
  );
});

Deno.test("zone-get: non-2xx propagates as Error", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: { success: false, errors: [{ code: 1001, message: "not found" }] } },
  ]);
  await assertRejects(
    async () => await action.execute!({ zoneId: "missing" }, ctx),
    Error,
    "returned 404",
  );
});
