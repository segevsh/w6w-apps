import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import userGet from "../../actions/user-get.ts";

Deno.test("user-get: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await userGet.execute({ "uid": "uid-1" } as never, ctx);
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/users/uid-1");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, null);
  assertEquals(result, { uid: "r1" });
});

Deno.test("user-get: declares its params and kind", () => {
  assertEquals((userGet.params ?? []).map((p) => p.key), ["uid"]);
  assertEquals((userGet.params ?? []).filter((p) => p.required).map((p) => p.key), ["uid"]);
  assertEquals(userGet.type, "read");
});
