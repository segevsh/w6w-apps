import { assert, assertEquals, assertRejects } from "@std/assert";
import ticketReply from "../../actions/ticket-reply.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "ticketFormId": "tf1", "ticketId": "t1", "message": "On it", "personaId": "pe1" };
const run = (
  ctx: Parameters<typeof ticketReply.execute>[1],
  input: Record<string, unknown> = sample,
) => ticketReply.execute(input as never, ctx) as Promise<unknown>;

Deno.test("ticket-reply: declares a perform action with a description, params and output", () => {
  assertEquals(ticketReply.key, "ticket-reply");
  assertEquals(ticketReply.type, "perform");
  assert((ticketReply.description ?? "").length > 0);
  assert(Array.isArray(ticketReply.output) && ticketReply.output.length > 0);
  assertEquals(ticketReply.idempotent, false);
});

Deno.test("ticket-reply: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true } }]);
  const out = await run(ctx);
  assertEquals(out, { "ok": true });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/ticket-form/tf1/tickets/t1/reply");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "message": "On it",
    "persona_id": "pe1",
  });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("ticket-reply: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
