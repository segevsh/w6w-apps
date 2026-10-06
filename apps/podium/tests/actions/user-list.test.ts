import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import userList from "../../actions/user-list.ts";

Deno.test("user-list: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ uid: "r1" }, { uid: "r2" }], metadata: { nextCursor: "c2" } },
  }]);
  const result = await userList.execute(
    {
      "limit": 5,
      "cursor": "cursor-1",
      "search": "search-1",
      "searchFields": "a1, b2",
      "includeAgents": true,
    } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/users");
  assertEquals(url.searchParams.get("limit"), "5");
  assertEquals(url.searchParams.get("cursor"), "cursor-1");
  assertEquals(url.searchParams.get("search"), "search-1");
  assertEquals(url.searchParams.getAll("searchFields[]"), ["a1", "b2"]);
  assertEquals(url.searchParams.get("includeAgents"), "true");
  assertEquals([...url.searchParams.keys()].length, 6);
  assertEquals(call.body, null);
  assertEquals(result, { items: [{ uid: "r1" }, { uid: "r2" }], nextCursor: "c2" });
});

Deno.test("user-list: a minimal call sends only what was set", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ uid: "r1" }, { uid: "r2" }], metadata: { nextCursor: "c2" } },
  }]);
  const result = await userList.execute({} as never, ctx);
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/users");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, null);
  assertEquals(result, { items: [{ uid: "r1" }, { uid: "r2" }], nextCursor: "c2" });
});

Deno.test("user-list: declares its params and kind", () => {
  assertEquals((userList.params ?? []).map((p) => p.key), [
    "limit",
    "cursor",
    "search",
    "searchFields",
    "includeAgents",
  ]);
  assertEquals((userList.params ?? []).filter((p) => p.required).map((p) => p.key), []);
  assertEquals(userList.type, "read");
});
