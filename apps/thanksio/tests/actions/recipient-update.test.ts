import { assert, assertEquals, assertRejects } from "@std/assert";
import recipientUpdate from "../../actions/recipient-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("recipient-update: calls PUT /api/v2/recipients/99 and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 99, "city": "Lenexa" } }]);
  const out = await recipientUpdate.execute(
    { "recipientId": "99", "city": "Lenexa", "postalCode": "66216" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v2/recipients/99");
  assertEquals(new URL(calls[0].url).origin, "https://api.thanks.io");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), { "city": "Lenexa", "postal_code": "66216" });
  assert((out.recipient as Record<string, string>).city === "Lenexa", JSON.stringify(out));
});

Deno.test("recipient-update: a vendor error surfaces the HTTP status and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { "message": "Not Found" } }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        recipientUpdate.execute(
          { "recipientId": "99", "city": "Lenexa", "postalCode": "66216" } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(err.message.includes("HTTP 404") && err.message.includes("Not Found"), err.message);
});

Deno.test("recipient-update: refuses an update with no fields", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(recipientUpdate.execute({ recipientId: "99" } as never, ctx)),
    Error,
    "at least one field",
  );
  assertEquals(calls.length, 0);
});
