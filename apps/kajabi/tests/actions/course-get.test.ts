import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import courseGet from "../../actions/course-get.ts";
import { doc, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("course-get: GETs the resource by id", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await courseGet.execute({ id: "7" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/courses/7");
});

test("course-get: forwards the sparse fieldset", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await courseGet.execute({ id: "7", fields: "title" }, ctx);
  assertEquals(queryOf(calls[0])["fields[courses]"], "title");
});

test("course-get: an id with a slash is percent-encoded, not path-injected", async () => {
  const { ctx, calls } = mockCtx([{ body: doc() }]);
  await courseGet.execute({ id: "a/b" }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/courses/a%2Fb");
});
