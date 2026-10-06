import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import locationGet from "../../actions/location-get.ts";

Deno.test("location-get: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await locationGet.execute({ "uid": "uid-1" } as never, ctx);
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/locations/uid-1");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, null);
  assertEquals(result, { uid: "r1" });
});

Deno.test("location-get: declares its params and kind", () => {
  assertEquals((locationGet.params ?? []).map((p) => p.key), ["uid"]);
  assertEquals((locationGet.params ?? []).filter((p) => p.required).map((p) => p.key), ["uid"]);
  assertEquals(locationGet.type, "read");
});
