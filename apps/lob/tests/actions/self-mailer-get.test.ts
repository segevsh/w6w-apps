import { assert, assertEquals, assertRejects } from "@std/assert";
import selfMailerGet from "../../actions/self-mailer-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("self-mailer-get: GETs the resource by id, path-escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "sfm_abc", object: "x" } }]);
  const out = await selfMailerGet.execute({ selfMailerId: " sfm_abc " }, ctx) as { id: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/self_mailers/sfm_abc");
  assertEquals(calls[0].body, null);
  assertEquals(out.id, "sfm_abc");
});

Deno.test("self-mailer-get: a slash in the id cannot change the route", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await selfMailerGet.execute({ selfMailerId: "sfm_a/../b" }, ctx);
  assert(!pathOf(calls[0].url).includes("/../"));
});

Deno.test("self-mailer-get: a 404 reports Lob's not_found code", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("not_found", "not found", 404) }]);
  await assertRejects(
    async () => await selfMailerGet.execute({ selfMailerId: "sfm_zzz" }, ctx),
    Error,
    "not_found",
  );
});
