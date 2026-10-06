import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/track-bulk-events.ts";

Deno.test("track-bulk-events: metadata", () => {
  assertEquals(action.key, "track-bulk-events");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assertEquals(action.params?.map((p) => p.key), ["events"]);
});

Deno.test("track-bulk-events: calls POST /events/trackBulk on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "successCount": 1, "failCount": 0 } }]);
  const out = await action.execute({ "events": [{ "x": 1 }] }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.iterable.com/api/events/trackBulk");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), { "events": [{ "x": 1 }] });
  assertEquals(out, { "successCount": 1, "failCount": 0 });
});

Deno.test("track-bulk-events: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "successCount": 1, "failCount": 0 } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({ "events": [{ "x": 1 }] }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/events/trackBulk");
});

Deno.test("track-bulk-events: rejects a missing `events` without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({}, ctx);
    },
    Error,
    "`events` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("track-bulk-events: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "events": [{ "x": 1 }] }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("track-bulk-events: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "events": [{ "x": 1 }] }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
