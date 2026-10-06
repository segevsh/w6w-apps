import { assert, assertEquals, assertRejects } from "@std/assert";
import ticketUpdate from "../../actions/ticket-update.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "ticketFormId": "tf1", "ticketId": "t1", "status": "closed", "priority": "high" };
const run = (
  ctx: Parameters<typeof ticketUpdate.execute>[1],
  input: Record<string, unknown> = sample,
) => ticketUpdate.execute(input as never, ctx) as Promise<unknown>;

Deno.test("ticket-update: declares a perform action with a description, params and output", () => {
  assertEquals(ticketUpdate.key, "ticket-update");
  assertEquals(ticketUpdate.type, "perform");
  assert((ticketUpdate.description ?? "").length > 0);
  assert(Array.isArray(ticketUpdate.output) && ticketUpdate.output.length > 0);
  assertEquals(ticketUpdate.idempotent, true);
});

Deno.test("ticket-update: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true } }]);
  const out = await run(ctx);
  assertEquals(out, { "ok": true });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/ticket-form/tf1/tickets/t1");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "status": "closed",
    "priority": "high",
  });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("ticket-update: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});

Deno.test("ticket-update: refuses an empty update without calling Aidbase", async () => {
  const { ctx, calls } = mockCtx([]);
  const input = { "ticketFormId": "tf1", "ticketId": "t1" };
  await assertRejects(() => run(ctx, input), Error, "at least one");
  assertEquals(calls.length, 0);
});
