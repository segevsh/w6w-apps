import { assertEquals } from "@std/assert";
import coursesGet from "../../actions/courses-get.ts";
import { assertRejectsWith, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("courses-get: fetches GET /courses/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 7, name: "My Course" } }]);
  const out = await coursesGet.execute({ id: "7" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/public/v1/courses/7");
  assertEquals(out, { id: 7, name: "My Course" });
});

Deno.test("courses-get: escapes the id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await coursesGet.execute({ id: "a/b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/public/v1/courses/a%2Fb");
});

Deno.test("courses-get: surfaces a 404 as a real error", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "Record not found." } }]);
  await assertRejectsWith(() => coursesGet.execute({ id: "999" }, ctx), "Record not found.");
});
