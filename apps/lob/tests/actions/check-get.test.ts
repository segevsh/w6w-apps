import { assert, assertEquals, assertRejects } from "@std/assert";
import checkGet from "../../actions/check-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("check-get: GETs the resource by id, path-escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "chk_abc", object: "x" } }]);
  const out = await checkGet.execute({ checkId: " chk_abc " }, ctx) as { id: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/checks/chk_abc");
  assertEquals(calls[0].body, null);
  assertEquals(out.id, "chk_abc");
});

Deno.test("check-get: a slash in the id cannot change the route", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await checkGet.execute({ checkId: "chk_a/../b" }, ctx);
  assert(!pathOf(calls[0].url).includes("/../"));
});

Deno.test("check-get: a 404 reports Lob's not_found code", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("not_found", "not found", 404) }]);
  await assertRejects(
    async () => await checkGet.execute({ checkId: "chk_zzz" }, ctx),
    Error,
    "not_found",
  );
});
