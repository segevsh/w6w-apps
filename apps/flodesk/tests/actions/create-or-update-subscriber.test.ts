import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";

import createOrUpdateSubscriber from "../../actions/create-or-update-subscriber.ts";

Deno.test("create-or-update-subscriber: POSTs snake_case keys, omitting what is unset", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "61b2" } }]);
  await createOrUpdateSubscriber.execute(
    {
      email: "ada@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      segmentIds: ["s1"],
      customFields: { favorite_color: "Lavender" },
      doubleOptin: true,
      optinIp: "1.2.3.4",
      optinTimestamp: "2023-01-02T15:04:05.999Z",
    },
    ctx,
  );

  assertEquals(calls[0].url, "https://api.flodesk.com/v1/subscribers");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    email: "ada@example.com",
    first_name: "Ada",
    last_name: "Lovelace",
    segment_ids: ["s1"],
    custom_fields: { favorite_color: "Lavender" },
    double_optin: true,
    optin_ip: "1.2.3.4",
    optin_timestamp: "2023-01-02T15:04:05.999Z",
  });
});

Deno.test("create-or-update-subscriber: sends only the keys supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await createOrUpdateSubscriber.execute({ id: "61b2" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { id: "61b2" });
});

Deno.test("create-or-update-subscriber: rejects a call with neither email nor id", () => {
  const { ctx, calls } = mockCtx([]);
  // Synchronous throw, deliberately: validation runs before any await, so the
  // action cannot be scheduled and then fail.
  assertThrows(() => createOrUpdateSubscriber.execute({}, ctx), Error);
  assertEquals(calls.length, 0, "must not spend a request on a known-bad payload");
});

Deno.test("create-or-update-subscriber: is marked idempotent — it is an upsert", () => {
  assertEquals(createOrUpdateSubscriber.idempotent, true);
});

// ----------------------------------------------------------- batch ----------
