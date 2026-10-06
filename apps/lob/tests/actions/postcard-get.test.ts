import { assert, assertEquals, assertRejects } from "@std/assert";
import postcardGet from "../../actions/postcard-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("postcard-get: GETs the resource by id, path-escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "psc_abc", object: "x" } }]);
  const out = await postcardGet.execute({ postcardId: " psc_abc " }, ctx) as { id: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/postcards/psc_abc");
  assertEquals(calls[0].body, null);
  assertEquals(out.id, "psc_abc");
});

Deno.test("postcard-get: a slash in the id cannot change the route", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await postcardGet.execute({ postcardId: "psc_a/../b" }, ctx);
  assert(!pathOf(calls[0].url).includes("/../"));
});

Deno.test("postcard-get: a 404 reports Lob's not_found code", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("not_found", "not found", 404) }]);
  await assertRejects(
    async () => await postcardGet.execute({ postcardId: "psc_zzz" }, ctx),
    Error,
    "not_found",
  );
});
