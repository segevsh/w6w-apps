import { assert, assertEquals, assertRejects } from "@std/assert";
import ticketBlock from "../../actions/ticket-block.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "ticketFormId": "tf1", "ticketId": "t1" };
const run = (
  ctx: Parameters<typeof ticketBlock.execute>[1],
  input: Record<string, unknown> = sample,
) => ticketBlock.execute(input as never, ctx) as Promise<unknown>;

Deno.test("ticket-block: declares a perform action with a description, params and output", () => {
  assertEquals(ticketBlock.key, "ticket-block");
  assertEquals(ticketBlock.type, "perform");
  assert((ticketBlock.description ?? "").length > 0);
  assert(Array.isArray(ticketBlock.output) && ticketBlock.output.length > 0);
  assertEquals(ticketBlock.idempotent, true);
});

Deno.test("ticket-block: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "success": true,
      "data": {
        "items": [{ "target": "t1", "targetType": "TICKET", "status": "ACTIVE" }],
        "failed": [],
      },
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "items": [{ "target": "t1", "targetType": "TICKET", "status": "ACTIVE" }],
    "failed": [],
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/ticket-form/tf1/tickets/t1/block");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("ticket-block: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
