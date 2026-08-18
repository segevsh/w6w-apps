import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-domain-list.ts";

const page = (items: unknown[], next: number | null) => ({
  domains: items,
  pagination: { count: items.length, next, prev: null },
});

Deno.test("project-domain-list: filters go as Vercel's string booleans", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: page([{ name: "a.com" }], null) }], {
    display: {},
  });
  const result = await action.execute!(
    { projectId: "my-app", production: true, verified: true },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v9/projects/my-app/domains");
  assertEquals(url.searchParams.get("production"), "true");
  assertEquals(url.searchParams.get("verified"), "true");
  assertEquals(result, [{ name: "a.com" }]);
});

Deno.test("project-domain-list: a blank project fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`projectId`");
  assertEquals(calls.length, 0);
});
