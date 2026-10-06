import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-screen-notes.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("list-screen-notes: GETs /projects/5db81e73e1e36ee19f138c1a/screens/s1/notes and wraps the array with its paging position", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "a" }, { id: "b" }] }]);
  const out = await action.execute({ projectId: "5db81e73e1e36ee19f138c1a", screenId: "s1" }, ctx);
  const u = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    u.origin + u.pathname,
    "https://api.zeplin.dev/v1/projects/5db81e73e1e36ee19f138c1a/screens/s1/notes",
  );
  assertEquals(u.searchParams.get("limit"), "30");
  assertEquals(u.searchParams.get("offset"), "0");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, {
    items: [{ id: "a" }, { id: "b" }],
    count: 2,
    limit: 30,
    offset: 0,
    next_offset: null,
  });
});

Deno.test("list-screen-notes: a full page yields next_offset; limit and offset are validated", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "a" }, { id: "b" }] }]);
  const out = await action.execute({
    ...{ projectId: "5db81e73e1e36ee19f138c1a", screenId: "s1" },
    limit: 2,
    offset: 4,
  }, ctx) as { next_offset: number | null };
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "2");
  assertEquals(new URL(calls[0].url).searchParams.get("offset"), "4");
  assertEquals(out.next_offset, 6);
  await assertRejects(
    async () =>
      await action.execute({
        ...{ projectId: "5db81e73e1e36ee19f138c1a", screenId: "s1" },
        limit: 101,
      }, mockCtx().ctx),
    Error,
    "Limit",
  );
});

Deno.test("list-screen-notes: a vendor error is thrown with its message; a non-array body is an error", async () => {
  const bad = mockCtx([{ status: 401, body: { message: "invalid_token" } }]);
  await assertRejects(
    async () =>
      await action.execute({ projectId: "5db81e73e1e36ee19f138c1a", screenId: "s1" }, bad.ctx),
    Error,
    "invalid_token",
  );
  const odd = mockCtx([{ body: { hello: "world" } }]);
  await assertRejects(
    async () =>
      await action.execute({ projectId: "5db81e73e1e36ee19f138c1a", screenId: "s1" }, odd.ctx),
    Error,
    "expected a JSON array",
  );
});
