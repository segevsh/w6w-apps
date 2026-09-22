import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-members.ts";

Deno.test("list-members: POSTs the { sort, filter } envelope to members/list/", async () => {
  const { ctx, calls } = mockCtx([{ body: { total: 1, offset: 0, limit: 100, items: [] } }]);
  const result = await action.execute!(
    { offset: 100, limit: 50, sort: [{ field: "last_name", direction: "asc" }] },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/members/list/");
  assertEquals(url.searchParams.get("offset"), "100");
  assertEquals(url.searchParams.get("limit"), "50");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    sort: [{ field: "last_name", direction: "asc" }],
  });
  assertEquals(result, { total: 1, offset: 0, limit: 100, items: [] });
});

Deno.test("list-members: defaults limit to 100 and sends an empty body", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "100");
  assertEquals(JSON.parse(calls[0].body!), {});
});
