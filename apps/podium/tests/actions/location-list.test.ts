import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import locationList from "../../actions/location-list.ts";

Deno.test("location-list: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ uid: "r1" }, { uid: "r2" }], metadata: { nextCursor: "c2" } },
  }]);
  const result = await locationList.execute(
    {
      "limit": 5,
      "cursor": "cursor-1",
      "search": "search-1",
      "searchFields": "a1, b2",
      "updatedAfter": "2026-10-01T00:00:00Z",
    } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/locations");
  assertEquals(url.searchParams.get("limit"), "5");
  assertEquals(url.searchParams.get("cursor"), "cursor-1");
  assertEquals(url.searchParams.get("search"), "search-1");
  assertEquals(url.searchParams.getAll("searchFields[]"), ["a1", "b2"]);
  assertEquals(url.searchParams.get("updatedAfter"), "2026-10-01T00:00:00Z");
  assertEquals([...url.searchParams.keys()].length, 6);
  assertEquals(call.body, null);
  assertEquals(result, { items: [{ uid: "r1" }, { uid: "r2" }], nextCursor: "c2" });
});

Deno.test("location-list: a minimal call sends only what was set", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ uid: "r1" }, { uid: "r2" }], metadata: { nextCursor: "c2" } },
  }]);
  const result = await locationList.execute({} as never, ctx);
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/locations");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, null);
  assertEquals(result, { items: [{ uid: "r1" }, { uid: "r2" }], nextCursor: "c2" });
});

Deno.test("location-list: declares its params and kind", () => {
  assertEquals((locationList.params ?? []).map((p) => p.key), [
    "limit",
    "cursor",
    "search",
    "searchFields",
    "updatedAfter",
  ]);
  assertEquals((locationList.params ?? []).filter((p) => p.required).map((p) => p.key), []);
  assertEquals(locationList.type, "read");
});
