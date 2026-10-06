// deno-lint-ignore-file no-explicit-any
import { assertEquals, assertRejects } from "@std/assert";
import ticketReply from "../../actions/ticket-reply.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("ticket-reply: POST /tickets/3/reply", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: {
      "id": "m9",
    },
  }]);
  const out = await ticketReply.execute({
    "ticket_id": 3,
    "author_type": "operator",
    "content": "ok",
    "message_type": "internal",
  } as any, ctx) as Record<string, any>;
  const items = (out.items ?? []) as Array<Record<string, any>>;
  void items;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/tickets/3/reply");
  assertEquals(calls[0].url.startsWith("https://api.tidio.com/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), {
    "author_type": "operator",
    "content": "ok",
    "message_type": "internal",
  });
  assertEquals(calls[0].headers.accept, "application/json; version=1");
  assertEquals(calls[0].headers["x-tidio-openapi-client-id"], undefined);
  assertEquals(out.id, "m9");
});

Deno.test("ticket-reply: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { errors: [{ code: "not_found", message: "Nope" }] },
  }]);
  const err = await assertRejects(async () =>
    await ticketReply.execute({
      "ticket_id": 3,
      "author_type": "operator",
      "content": "ok",
      "message_type": "internal",
    } as any, ctx)
  ) as Error;
  assertEquals(err.message.includes("(404)"), true);
  assertEquals(err.message.includes("not_found: Nope"), true);
});
