import { assertEquals } from "@std/assert";
import accountGet from "../../actions/account-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-get: defaults accountId to ~", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1", mainNumber: "+15550000000" } }]);
  const out = await accountGet.execute({}, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/restapi/v1.0/account/~");
  assertEquals(out.id, "1");
  assertEquals(out.mainNumber, "+15550000000");
});

Deno.test("account-get: an explicit accountId overrides the default", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "999" } }]);
  await accountGet.execute({ accountId: "999" }, ctx);
  assertEquals(pathOf(calls[0].url), "/restapi/v1.0/account/999");
});

Deno.test("account-get: has a single accountId param, defaulting to ~", () => {
  assertEquals(accountGet.params?.length, 1);
  assertEquals(accountGet.params?.[0].default, "~");
});
