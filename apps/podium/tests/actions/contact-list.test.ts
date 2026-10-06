import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import contactList from "../../actions/contact-list.ts";

Deno.test("contact-list: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ uid: "r1" }, { uid: "r2" }], metadata: { nextCursor: "c2" } },
  }]);
  const result = await contactList.execute(
    { "limit": 5, "cursor": "cursor-1", "updatedAfter": "2026-10-01T00:00:00Z" } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/contacts");
  assertEquals(url.searchParams.get("limit"), "5");
  assertEquals(url.searchParams.get("cursor"), "cursor-1");
  assertEquals(url.searchParams.get("updated_at"), "2026-10-01T00:00:00Z");
  assertEquals([...url.searchParams.keys()].length, 3);
  assertEquals(call.body, null);
  assertEquals(result, { items: [{ uid: "r1" }, { uid: "r2" }], nextCursor: "c2" });
});

Deno.test("contact-list: a minimal call sends only what was set", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ uid: "r1" }, { uid: "r2" }], metadata: { nextCursor: "c2" } },
  }]);
  const result = await contactList.execute({} as never, ctx);
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/contacts");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, null);
  assertEquals(result, { items: [{ uid: "r1" }, { uid: "r2" }], nextCursor: "c2" });
});

Deno.test("contact-list: declares its params and kind", () => {
  assertEquals((contactList.params ?? []).map((p) => p.key), ["limit", "cursor", "updatedAfter"]);
  assertEquals((contactList.params ?? []).filter((p) => p.required).map((p) => p.key), []);
  assertEquals(contactList.type, "read");
});
