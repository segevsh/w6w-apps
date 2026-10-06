import { assert, assertEquals, assertRejects } from "@std/assert";
import recipientCreate from "../../actions/recipient-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("recipient-create: calls POST /api/v2/recipients and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 99, "name": "Ada" } }]);
  const out = await recipientCreate.execute(
    {
      "mailingListId": 7,
      "name": "Ada",
      "address": "1 Main St",
      "postalCode": "66216",
      "custom": '{"custom1":"gold"}',
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/recipients");
  assertEquals(new URL(calls[0].url).origin, "https://api.thanks.io");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "mailing_list_id": 7,
    "name": "Ada",
    "address": "1 Main St",
    "postal_code": "66216",
    "custom1": "gold",
  });
  assert(out.id === 99, JSON.stringify(out));
});

Deno.test("recipient-create: a vendor error surfaces the HTTP status and message", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { "message": "Mailing List Does Not Exist" } }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        recipientCreate.execute(
          {
            "mailingListId": 7,
            "name": "Ada",
            "address": "1 Main St",
            "postalCode": "66216",
            "custom": '{"custom1":"gold"}',
          } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(err.message.includes("HTTP 400") && err.message.includes("Does Not Exist"), err.message);
});

Deno.test("recipient-create: needs an address or an email", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(recipientCreate.execute({ mailingListId: 7, name: "Ada" } as never, ctx)),
    Error,
    "Address",
  );
  assertEquals(calls.length, 0);
});
