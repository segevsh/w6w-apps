import { assertEquals, assertRejects } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import contactUpdate from "../../actions/contact-update.ts";

Deno.test("contact-update: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await contactUpdate.execute(
    {
      "identifier": "ann@example.com",
      "name": "name-1",
      "email": "ann@example.com",
      "phoneNumber": "+15555550123",
      "locations": "a1, b2",
      "conversationUid": "conversationUid-1",
      "address": { "addressLine1": "1 Main St" },
    } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "PATCH");
  assertEquals(url.origin + url.pathname, API + "/contacts/ann%40example.com");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(JSON.parse(call.body ?? "null"), {
    "name": "name-1",
    "email": "ann@example.com",
    "phoneNumber": "+15555550123",
    "locations": ["a1", "b2"],
    "conversationUid": "conversationUid-1",
    "address": { "addressLine1": "1 Main St" },
  });
  assertEquals(call.headers["content-type"], "application/json");
  assertEquals(result, { uid: "r1" });
});

Deno.test("contact-update: a minimal call sends only what was set", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await contactUpdate.execute({ "identifier": "ann@example.com" } as never, ctx);
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "PATCH");
  assertEquals(url.origin + url.pathname, API + "/contacts/ann%40example.com");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, "{}");
  assertEquals(result, { uid: "r1" });
});

Deno.test("contact-update: declares its params and kind", () => {
  assertEquals((contactUpdate.params ?? []).map((p) => p.key), [
    "identifier",
    "name",
    "email",
    "phoneNumber",
    "locations",
    "conversationUid",
    "address",
  ]);
  assertEquals((contactUpdate.params ?? []).filter((p) => p.required).map((p) => p.key), [
    "identifier",
  ]);
  assertEquals(contactUpdate.type, "perform");
  assertEquals(contactUpdate.idempotent, true);
});

Deno.test("contact-update: a malformed JSON param fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await contactUpdate.execute(
        { "identifier": "ann@example.com", "address": "{not json" } as never,
        ctx,
      ),
    Error,
    "not valid JSON",
  );
  assertEquals(calls.length, 0);
});
