import { assertEquals } from "@std/assert";
import presenceGet from "../../actions/presence-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("presence-get: builds the presence path", async () => {
  const { ctx, calls } = mockCtx([{ body: { presenceStatus: "Available" } }]);
  const out = await presenceGet.execute({}, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/restapi/v1.0/account/~/extension/~/presence");
  assertEquals(out.presenceStatus, "Available");
});

Deno.test("presence-get: boolean flags are only sent when true", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await presenceGet.execute({ detailedTelephonyState: false, sipData: false }, ctx);
  assertEquals(queryOf(calls[0].url), {});

  await presenceGet.execute({ detailedTelephonyState: true, sipData: true }, ctx);
  assertEquals(queryOf(calls[1].url), { detailedTelephonyState: "true", sipData: "true" });
});
