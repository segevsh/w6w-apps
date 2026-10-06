import { assert, assertEquals, assertRejects } from "@std/assert";
import letterGet from "../../actions/letter-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("letter-get: GETs the resource by id, path-escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "ltr_abc", object: "x" } }]);
  const out = await letterGet.execute({ letterId: " ltr_abc " }, ctx) as { id: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/letters/ltr_abc");
  assertEquals(calls[0].body, null);
  assertEquals(out.id, "ltr_abc");
});

Deno.test("letter-get: a slash in the id cannot change the route", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await letterGet.execute({ letterId: "ltr_a/../b" }, ctx);
  assert(!pathOf(calls[0].url).includes("/../"));
});

Deno.test("letter-get: a 404 reports Lob's not_found code", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("not_found", "not found", 404) }]);
  await assertRejects(
    async () => await letterGet.execute({ letterId: "ltr_zzz" }, ctx),
    Error,
    "not_found",
  );
});
