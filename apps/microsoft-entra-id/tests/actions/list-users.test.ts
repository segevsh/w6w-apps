import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-users.ts";

Deno.test("list-users: GETs /users with the default page size", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "u1" }] } }]);
  const out = await action.execute({ top: 100 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1.0/users");
  assertEquals(url.searchParams.get("$top"), "100");
  assertEquals(calls[0].headers.consistencylevel, undefined);
  assertEquals(out.value.length, 1);
  assertEquals(out.pages, 1);
});

Deno.test("list-users: filter, select and orderby go through as OData params", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({
    filter: "accountEnabled eq true",
    select: ["id", "displayName"],
    orderby: "displayName",
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("$filter"), "accountEnabled eq true");
  assertEquals(q.get("$select"), "id,displayName");
  assertEquals(q.get("$orderby"), "displayName");
});

Deno.test("list-users: search quotes the term and sends ConsistencyLevel + $count", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [], "@odata.count": 0 } }]);
  const out = await action.execute({ search: "displayName:Adele" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("$search"), '"displayName:Adele"');
  assertEquals(q.get("$count"), "true");
  assertEquals(calls[0].headers.consistencylevel, "eventual");
  assertEquals(out.count, 0);
});

Deno.test("list-users: advancedQuery alone sets the header and $count", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ filter: "mail ne null", advancedQuery: true }, ctx);
  assertEquals(calls[0].headers.consistencylevel, "eventual");
  assertEquals(new URL(calls[0].url).searchParams.get("$count"), "true");
});

Deno.test("list-users: all=true follows nextLink", async () => {
  const next = "https://graph.microsoft.com/v1.0/users?$skiptoken=2";
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "a" }], "@odata.nextLink": next } },
    { body: { value: [{ id: "b" }] } },
  ]);
  const out = await action.execute({ all: true }, ctx);
  assertEquals(calls[1].url, next);
  assertEquals(out.value.map((u) => u.id), ["a", "b"]);
  assertEquals(out.nextLink, undefined);
});

Deno.test("list-users: offers a page size capped at 999", () => {
  const top = action.params!.find((p) => p.key === "top")!;
  assertEquals(top.validation?.max, 999);
});
