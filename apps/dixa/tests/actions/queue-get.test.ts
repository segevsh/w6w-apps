import { assert, assertEquals } from "@std/assert";
import queueGet from "../../actions/queue-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("queue-get: calls GET /v1/queues/11111111-2222-3333-4444-555555555555", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "11111111-2222-3333-4444-555555555555" } },
  }]);
  const out = await queueGet.execute(
    { "queueId": "11111111-2222-3333-4444-555555555555" } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).origin, "https://dev.dixa.io");
  assertEquals(pathOf(calls[0].url), "/v1/queues/11111111-2222-3333-4444-555555555555");
  assertEquals(queryOf(calls[0].url), {});
  // Credentials belong to `sign`; an action never sets them.
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "data": { "id": "11111111-2222-3333-4444-555555555555" } });
});

Deno.test("queue-get: surfaces a Dixa error message with the status", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { message: "Invalid value for: body" } }]);
  let message = "";
  try {
    await queueGet.execute({ "queueId": "11111111-2222-3333-4444-555555555555" } as never, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("Dixa 400"), message);
  assert(message.includes("Invalid value for: body"), message);
});

Deno.test("queue-get: rejects bad input before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await queueGet.execute({ "queueId": "" } as never, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("queueId is required"), message);
  assertEquals(calls.length, 0);
});
