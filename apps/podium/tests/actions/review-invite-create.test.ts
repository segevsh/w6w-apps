import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import reviewInviteCreate from "../../actions/review-invite-create.ts";

Deno.test("review-invite-create: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await reviewInviteCreate.execute(
    {
      "locationUid": "locationUid-1",
      "email": "ann@example.com",
      "phoneNumber": "+15555550123",
    } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "POST");
  assertEquals(url.origin + url.pathname, API + "/reviews/invites");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(JSON.parse(call.body ?? "null"), {
    "locationUid": "locationUid-1",
    "email": "ann@example.com",
    "phoneNumber": "+15555550123",
  });
  assertEquals(call.headers["content-type"], "application/json");
  assertEquals(result, { uid: "r1" });
});

Deno.test("review-invite-create: a minimal call sends only what was set", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await reviewInviteCreate.execute({ "locationUid": "locationUid-1" } as never, ctx);
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "POST");
  assertEquals(url.origin + url.pathname, API + "/reviews/invites");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(JSON.parse(call.body ?? "null"), { "locationUid": "locationUid-1" });
  assertEquals(call.headers["content-type"], "application/json");
  assertEquals(result, { uid: "r1" });
});

Deno.test("review-invite-create: declares its params and kind", () => {
  assertEquals((reviewInviteCreate.params ?? []).map((p) => p.key), [
    "locationUid",
    "email",
    "phoneNumber",
  ]);
  assertEquals((reviewInviteCreate.params ?? []).filter((p) => p.required).map((p) => p.key), [
    "locationUid",
  ]);
  assertEquals(reviewInviteCreate.type, "perform");
  assertEquals(reviewInviteCreate.idempotent, false);
});
