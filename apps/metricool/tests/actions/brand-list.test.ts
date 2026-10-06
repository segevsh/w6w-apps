import { assertEquals, assertRejects } from "@std/assert";
import brandList from "../../actions/brand-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("brand-list: GET /v2/settings/brands returns items and count, no blogId", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: 1 }, { id: 2 }]) }]);
  const out = await brandList.execute({}, ctx);
  assertEquals(out, { items: [{ id: 1 }, { id: 2 }], count: 2 });
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/settings/brands");
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("brand-list: a vendor error throws with its detail", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { status: "UNAUTHORIZED", detail: "nope" } }]);
  await assertRejects(
    () => Promise.resolve(brandList.execute({}, ctx)) as Promise<unknown>,
    Error,
    "nope",
  );
});
