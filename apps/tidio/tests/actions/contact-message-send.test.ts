// deno-lint-ignore-file no-explicit-any
import { assertEquals, assertRejects } from "@std/assert";
import contactMessageSend from "../../actions/contact-message-send.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-message-send: POST /contacts/u-1/messages", async () => {
  const { ctx, calls } = mockCtx([{
    status: 202,
    body: {
      "status": "accepted",
    },
  }]);
  const out = await contactMessageSend.execute({
    "contact_id": "u-1",
    "message": "hello",
  } as any, ctx) as Record<string, any>;
  const items = (out.items ?? []) as Array<Record<string, any>>;
  void items;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/contacts/u-1/messages");
  assertEquals(calls[0].url.startsWith("https://api.tidio.com/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), {
    "message": "hello",
  });
  assertEquals(calls[0].headers.accept, "application/json; version=1");
  assertEquals(calls[0].headers["x-tidio-openapi-client-id"], undefined);
  assertEquals(out.status, "accepted");
});

Deno.test("contact-message-send: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { errors: [{ code: "not_found", message: "Nope" }] },
  }]);
  const err = await assertRejects(async () =>
    await contactMessageSend.execute({
      "contact_id": "u-1",
      "message": "hello",
    } as any, ctx)
  ) as Error;
  assertEquals(err.message.includes("(404)"), true);
  assertEquals(err.message.includes("not_found: Nope"), true);
});
