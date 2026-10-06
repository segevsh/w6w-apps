import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import templateList from "../../actions/template-list.ts";

Deno.test("template-list: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ uid: "r1" }, { uid: "r2" }], metadata: { nextCursor: "c2" } },
  }]);
  const result = await templateList.execute(
    { "types": "a1, b2", "locationUid": "locationUid-1" } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/templates");
  assertEquals(url.searchParams.getAll("types[]"), ["a1", "b2"]);
  assertEquals(url.searchParams.get("locationUid"), "locationUid-1");
  assertEquals([...url.searchParams.keys()].length, 3);
  assertEquals(call.body, null);
  assertEquals(result, { items: [{ uid: "r1" }, { uid: "r2" }], nextCursor: "c2" });
});

Deno.test("template-list: a minimal call sends only what was set", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ uid: "r1" }, { uid: "r2" }], metadata: { nextCursor: "c2" } },
  }]);
  const result = await templateList.execute({} as never, ctx);
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/templates");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, null);
  assertEquals(result, { items: [{ uid: "r1" }, { uid: "r2" }], nextCursor: "c2" });
});

Deno.test("template-list: declares its params and kind", () => {
  assertEquals((templateList.params ?? []).map((p) => p.key), ["types", "locationUid"]);
  assertEquals((templateList.params ?? []).filter((p) => p.required).map((p) => p.key), []);
  assertEquals(templateList.type, "read");
});
