import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx, outputKeys } from "../_helpers.ts";

import batchCreateOrUpdateSubscribers from "../../actions/batch-create-or-update-subscribers.ts";

Deno.test("batch: POSTs /v1/subscribers/batch wrapped in `subscribers`", async () => {
  const { ctx, calls } = mockCtx([{ body: { successes: [], failures: [] } }]);
  await batchCreateOrUpdateSubscribers.execute(
    { subscribers: [{ email: "a@b.com" }, { email: "c@d.com" }] },
    ctx,
  );
  assertEquals(calls[0].url, "https://api.flodesk.com/v1/subscribers/batch");
  assertEquals(JSON.parse(calls[0].body!), {
    subscribers: [{ email: "a@b.com" }, { email: "c@d.com" }],
  });
});

Deno.test("batch: enforces Flodesk's documented 50-item cap before calling", () => {
  const { ctx, calls } = mockCtx([]);
  const subscribers = Array.from({ length: 51 }, (_, i) => ({ email: `u${i}@e.com` }));
  const err = assertThrows(
    () => batchCreateOrUpdateSubscribers.execute({ subscribers }, ctx),
    Error,
  );
  assert(err.message.includes("50"));
  assertEquals(calls.length, 0, "must not spend one of the 20 requests/minute on a 400");
});

Deno.test("batch: accepts exactly 50", async () => {
  const { ctx, calls } = mockCtx([{ body: { successes: [], failures: [] } }]);
  const subscribers = Array.from({ length: 50 }, (_, i) => ({ email: `u${i}@e.com` }));
  await batchCreateOrUpdateSubscribers.execute({ subscribers }, ctx);
  assertEquals(calls.length, 1);
});

Deno.test("batch: rejects an empty or non-array payload", () => {
  const { ctx } = mockCtx([]);
  assertThrows(() => batchCreateOrUpdateSubscribers.execute({ subscribers: [] }, ctx), Error);
  assertThrows(
    () => batchCreateOrUpdateSubscribers.execute({ subscribers: "nope" as never }, ctx),
    Error,
  );
});

Deno.test("batch: surfaces failures alongside successes", async () => {
  const body = {
    successes: [{ id: "1", email: "a@b.com" }],
    failures: [{ index: 1, email: "bad", code: "invalid_email", message: "not an email" }],
  };
  const { ctx } = mockCtx([{ body }]);
  const out = await batchCreateOrUpdateSubscribers.execute(
    { subscribers: [{ email: "a@b.com" }, { email: "bad" }] },
    ctx,
  );
  assertEquals(out, body);
  // Both arrays must be declared outputs — a 200 here does not mean "all written".
  const keys = outputKeys(batchCreateOrUpdateSubscribers);
  assert(keys.includes("successes") && keys.includes("failures"));
});

// -------------------------------------------------------- segments ----------
