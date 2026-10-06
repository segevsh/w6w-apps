import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bulk-update-subscriptions.ts";

Deno.test("bulk-update-subscriptions: metadata", () => {
  assertEquals(action.key, "bulk-update-subscriptions");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assertEquals(action.params?.map((p) => p.key), ["updateSubscriptionsRequests"]);
});

Deno.test("bulk-update-subscriptions: calls POST /users/bulkUpdateSubscriptions on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "successCount": 1, "failCount": 0 } }]);
  const out = await action.execute({ "updateSubscriptionsRequests": [{ "x": 1 }] }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.iterable.com/api/users/bulkUpdateSubscriptions");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), { "updateSubscriptionsRequests": [{ "x": 1 }] });
  assertEquals(out, { "successCount": 1, "failCount": 0 });
});

Deno.test("bulk-update-subscriptions: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "successCount": 1, "failCount": 0 } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({ "updateSubscriptionsRequests": [{ "x": 1 }] }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/users/bulkUpdateSubscriptions");
});

Deno.test("bulk-update-subscriptions: rejects a missing `updateSubscriptionsRequests` without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({}, ctx);
    },
    Error,
    "`updateSubscriptionsRequests` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("bulk-update-subscriptions: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "updateSubscriptionsRequests": [{ "x": 1 }] }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("bulk-update-subscriptions: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "updateSubscriptionsRequests": [{ "x": 1 }] }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
