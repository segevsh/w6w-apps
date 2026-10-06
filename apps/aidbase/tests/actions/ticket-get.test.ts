import { assert, assertEquals, assertRejects } from "@std/assert";
import ticketGet from "../../actions/ticket-get.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "ticketFormId": "tf1", "ticketId": "t1" };
const run = (
  ctx: Parameters<typeof ticketGet.execute>[1],
  input: Record<string, unknown> = sample,
) => ticketGet.execute(input as never, ctx) as Promise<unknown>;

Deno.test("ticket-get: declares a read action with a description, params and output", () => {
  assertEquals(ticketGet.key, "ticket-get");
  assertEquals(ticketGet.type, "read");
  assert((ticketGet.description ?? "").length > 0);
  assert(Array.isArray(ticketGet.output) && ticketGet.output.length > 0);
});

Deno.test("ticket-get: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "id": "t1", "status": "open", "conversation": [] } },
  }]);
  const out = await run(ctx);
  assertEquals(out, { "id": "t1", "status": "open", "conversation": [] });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/ticket-form/tf1/tickets/t1");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("ticket-get: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
