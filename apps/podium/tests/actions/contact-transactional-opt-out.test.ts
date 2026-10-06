import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import contactTransactionalOptOut from "../../actions/contact-transactional-opt-out.ts";

Deno.test("contact-transactional-opt-out: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await contactTransactionalOptOut.execute(
    {
      "phoneNumber": "+15555550123",
      "locationUid": "locationUid-1",
      "channelType": "PHONE",
    } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "POST");
  assertEquals(url.origin + url.pathname, API + "/contacts/transactional/opt_out");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(JSON.parse(call.body ?? "null"), {
    "channel": { "identifier": "+15555550123", "type": "PHONE" },
    "locationUid": "locationUid-1",
  });
  assertEquals(call.headers["content-type"], "application/json");
  assertEquals(result, { uid: "r1" });
});

Deno.test("contact-transactional-opt-out: a minimal call sends only what was set", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await contactTransactionalOptOut.execute(
    { "phoneNumber": "+15555550123", "locationUid": "locationUid-1" } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "POST");
  assertEquals(url.origin + url.pathname, API + "/contacts/transactional/opt_out");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(JSON.parse(call.body ?? "null"), {
    "channel": { "identifier": "+15555550123", "type": "PHONE" },
    "locationUid": "locationUid-1",
  });
  assertEquals(call.headers["content-type"], "application/json");
  assertEquals(result, { uid: "r1" });
});

Deno.test("contact-transactional-opt-out: declares its params and kind", () => {
  assertEquals((contactTransactionalOptOut.params ?? []).map((p) => p.key), [
    "phoneNumber",
    "locationUid",
    "channelType",
  ]);
  assertEquals(
    (contactTransactionalOptOut.params ?? []).filter((p) => p.required).map((p) => p.key),
    ["phoneNumber", "locationUid"],
  );
  assertEquals(contactTransactionalOptOut.type, "perform");
  assertEquals(contactTransactionalOptOut.idempotent, true);
});
