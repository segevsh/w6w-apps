import { assertEquals, assertRejects } from "@std/assert";
import { cfOk, mockCtx } from "../_helpers.ts";
import action from "../../actions/zone-settings-get.ts";

Deno.test("zone-settings-get: GETs /zones/{id}/settings", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: cfOk([{ id: "ssl", value: "full" }]) },
  ]);
  const result = await action.execute!({ zoneId: "z1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.cloudflare.com/client/v4/zones/z1/settings");
  assertEquals(result, [{ id: "ssl", value: "full" }]);
});

Deno.test("zone-settings-get: missing zoneId rejects", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ zoneId: "" }, ctx),
    Error,
    "`zoneId`",
  );
});
