import { assertEquals } from "@std/assert";
import { mockFreshserviceCtx } from "../_helpers.ts";
import action from "../../actions/asset-get.ts";

Deno.test("asset-get: addresses the asset by display_id, as the API requires", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { asset: { display_id: 8 } } }]);
  const out = await action.execute({ displayId: 8 }, ctx);
  assertEquals(calls[0].url, "https://acme.freshservice.com/api/v2/assets/8");
  assertEquals(out, { display_id: 8 });
});

Deno.test("asset-get: opts into type_fields only when asked", async () => {
  const on = mockFreshserviceCtx([{ body: { asset: {} } }]);
  await action.execute({ displayId: 8, includeTypeFields: true }, on.ctx);
  assertEquals(
    on.calls[0].url,
    "https://acme.freshservice.com/api/v2/assets/8?include=type_fields",
  );

  const off = mockFreshserviceCtx([{ body: { asset: {} } }]);
  await action.execute({ displayId: 8, includeTypeFields: false }, off.ctx);
  assertEquals(off.calls[0].url, "https://acme.freshservice.com/api/v2/assets/8");
});
