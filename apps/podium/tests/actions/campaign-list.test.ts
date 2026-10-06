import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import campaignList from "../../actions/campaign-list.ts";

Deno.test("campaign-list: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ uid: "r1" }, { uid: "r2" }], metadata: { nextCursor: "c2" } },
  }]);
  const result = await campaignList.execute({ "status": "ACTIVE" } as never, ctx);
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/campaigns");
  assertEquals(url.searchParams.get("status"), "ACTIVE");
  assertEquals([...url.searchParams.keys()].length, 1);
  assertEquals(call.body, null);
  assertEquals(result, { items: [{ uid: "r1" }, { uid: "r2" }], nextCursor: "c2" });
});

Deno.test("campaign-list: a minimal call sends only what was set", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ uid: "r1" }, { uid: "r2" }], metadata: { nextCursor: "c2" } },
  }]);
  const result = await campaignList.execute({} as never, ctx);
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/campaigns");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, null);
  assertEquals(result, { items: [{ uid: "r1" }, { uid: "r2" }], nextCursor: "c2" });
});

Deno.test("campaign-list: declares its params and kind", () => {
  assertEquals((campaignList.params ?? []).map((p) => p.key), ["status"]);
  assertEquals((campaignList.params ?? []).filter((p) => p.required).map((p) => p.key), []);
  assertEquals(campaignList.type, "read");
});
