import { assertEquals, assertRejects } from "@std/assert";
import brandGet from "../../actions/brand-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("brand-get: GET /v2/settings/brands/{id} returns the brand", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7, title: "Acme" }) }]);
  const out = await brandGet.execute({ brandId: "7" }, ctx);
  assertEquals(out, { id: 7, title: "Acme" });
  assertEquals(pathOf(calls[0].url), "/api/v2/settings/brands/7");
});

Deno.test("brand-get: an empty id is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() =>
    Promise.resolve(brandGet.execute({ brandId: " " }, ctx)) as Promise<unknown>
  );
  assertEquals(calls.length, 0);
});
