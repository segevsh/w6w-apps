import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-pages.ts";

test("list-pages: no Section ID means the flat, whole-location listing", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/onenote/pages");
});

test("list-pages: Section ID scopes to that section", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ sectionId: "sec1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/onenote/sections/sec1/pages");
});

test("list-pages: default page size is 20, matching Graph's own default", () => {
  const top = action.params!.find((p) => p.key === "top")!;
  assertEquals(top.default, 20);
});
