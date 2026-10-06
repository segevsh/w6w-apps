import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import reviewInviteList from "../../actions/review-invite-list.ts";

Deno.test("review-invite-list: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ uid: "r1" }, { uid: "r2" }], metadata: { nextCursor: "c2" } },
  }]);
  const result = await reviewInviteList.execute(
    {
      "limit": 5,
      "cursor": "cursor-1",
      "senderUid": "senderUid-1",
      "createdAfter": "2026-10-01T00:00:00Z",
      "createdBefore": "2026-10-01T00:00:00Z",
    } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/reviews/invites");
  assertEquals(url.searchParams.get("limit"), "5");
  assertEquals(url.searchParams.get("cursor"), "cursor-1");
  assertEquals(url.searchParams.get("senderUid"), "senderUid-1");
  assertEquals(url.searchParams.get("createdAt[gte]"), "2026-10-01T00:00:00Z");
  assertEquals(url.searchParams.get("createdAt[lte]"), "2026-10-01T00:00:00Z");
  assertEquals([...url.searchParams.keys()].length, 5);
  assertEquals(call.body, null);
  assertEquals(result, { items: [{ uid: "r1" }, { uid: "r2" }], nextCursor: "c2" });
});

Deno.test("review-invite-list: a minimal call sends only what was set", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ uid: "r1" }, { uid: "r2" }], metadata: { nextCursor: "c2" } },
  }]);
  const result = await reviewInviteList.execute({} as never, ctx);
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/reviews/invites");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, null);
  assertEquals(result, { items: [{ uid: "r1" }, { uid: "r2" }], nextCursor: "c2" });
});

Deno.test("review-invite-list: declares its params and kind", () => {
  assertEquals((reviewInviteList.params ?? []).map((p) => p.key), [
    "limit",
    "cursor",
    "senderUid",
    "createdAfter",
    "createdBefore",
  ]);
  assertEquals((reviewInviteList.params ?? []).filter((p) => p.required).map((p) => p.key), []);
  assertEquals(reviewInviteList.type, "read");
});
