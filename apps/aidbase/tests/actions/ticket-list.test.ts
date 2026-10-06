import { assert, assertEquals, assertRejects } from "@std/assert";
import ticketList from "../../actions/ticket-list.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = {
  "ticketFormId": "tf1",
  "status": "open",
  "createdAfter": "2026-01-01T00:00:00Z",
  "limit": 10,
};
const run = (
  ctx: Parameters<typeof ticketList.execute>[1],
  input: Record<string, unknown> = sample,
) => ticketList.execute(input as never, ctx) as Promise<unknown>;

Deno.test("ticket-list: declares a read action with a description, params and output", () => {
  assertEquals(ticketList.key, "ticket-list");
  assertEquals(ticketList.type, "read");
  assert((ticketList.description ?? "").length > 0);
  assert(Array.isArray(ticketList.output) && ticketList.output.length > 0);
});

Deno.test("ticket-list: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "success": true,
      "data": { "items": [{ "id": "t1", "status": "open" }], "total": 230, "has_more": false },
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "items": [{ "id": "t1", "status": "open" }],
    "total": 230,
    "hasMore": false,
    "nextCursor": null,
    "count": 1,
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/ticket-form/tf1/tickets");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {
    "status": "open",
    "created_after": "2026-01-01T00:00:00Z",
    "limit": "10",
  });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("ticket-list: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
