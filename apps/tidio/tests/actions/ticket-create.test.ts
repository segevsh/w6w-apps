// deno-lint-ignore-file no-explicit-any
import { assertEquals, assertRejects } from "@std/assert";
import ticketCreate from "../../actions/ticket-create.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("ticket-create: POST /tickets/as-contact", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: {
      "id": 42,
    },
  }]);
  const out = await ticketCreate.execute({
    "contact_email": "a@b.co",
    "subject": "S",
    "message_content": "M",
    "tag_ids": [
      1,
      2,
    ],
  } as any, ctx) as Record<string, any>;
  const items = (out.items ?? []) as Array<Record<string, any>>;
  void items;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/tickets/as-contact");
  assertEquals(calls[0].url.startsWith("https://api.tidio.com/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), {
    "contact_email": "a@b.co",
    "subject": "S",
    "message_content": "M",
    "tag_ids": [
      1,
      2,
    ],
  });
  assertEquals(calls[0].headers.accept, "application/json; version=1");
  assertEquals(calls[0].headers["x-tidio-openapi-client-id"], undefined);
  assertEquals(out.id, 42);
});

Deno.test("ticket-create: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { errors: [{ code: "not_found", message: "Nope" }] },
  }]);
  const err = await assertRejects(async () =>
    await ticketCreate.execute({
      "contact_email": "a@b.co",
      "subject": "S",
      "message_content": "M",
      "tag_ids": [
        1,
        2,
      ],
    } as any, ctx)
  ) as Error;
  assertEquals(err.message.includes("(404)"), true);
  assertEquals(err.message.includes("not_found: Nope"), true);
});
