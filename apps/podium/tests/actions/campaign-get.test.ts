import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import campaignGet from "../../actions/campaign-get.ts";

Deno.test("campaign-get: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await campaignGet.execute({ "uid": "uid-1" } as never, ctx);
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/campaigns/uid-1");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, null);
  assertEquals(result, { uid: "r1" });
});

Deno.test("campaign-get: declares its params and kind", () => {
  assertEquals((campaignGet.params ?? []).map((p) => p.key), ["uid"]);
  assertEquals((campaignGet.params ?? []).filter((p) => p.required).map((p) => p.key), ["uid"]);
  assertEquals(campaignGet.type, "read");
});
