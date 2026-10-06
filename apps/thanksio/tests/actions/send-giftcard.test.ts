import { assert, assertEquals, assertRejects } from "@std/assert";
import sendGiftcard from "../../actions/send-giftcard.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("send-giftcard: calls POST /api/v2/send/giftcard and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 42, "status": "reviewing" } }]);
  const out = await sendGiftcard.execute(
    {
      "mailingListIds": "5",
      "giftcardBrand": "amazonus",
      "giftcardAmountInCents": 1000,
      "imageTemplateId": 4,
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/send/giftcard");
  assertEquals(new URL(calls[0].url).origin, "https://api.thanks.io");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "mailing_list_ids": [5],
    "giftcard_brand": "amazonus",
    "giftcard_amount_in_cents": 1000,
    "image_template_id": 4,
  });
  assert(out.orderId === 42, JSON.stringify(out));
});

Deno.test("send-giftcard: a vendor error surfaces the HTTP status and message", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { "message": "Invalid amount" } }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        sendGiftcard.execute(
          {
            "mailingListIds": "5",
            "giftcardBrand": "amazonus",
            "giftcardAmountInCents": 1000,
            "imageTemplateId": 4,
          } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(err.message.includes("HTTP 422") && err.message.includes("Invalid amount"), err.message);
});

Deno.test("send-giftcard: refuses an order with no audience before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const bad = { "giftcardBrand": "amazonus", "giftcardAmountInCents": 1000, "imageTemplateId": 4 };
  await assertRejects(
    () => Promise.resolve(sendGiftcard.execute(bad as never, ctx)),
    Error,
    "no audience",
  );
  assertEquals(calls.length, 0);
});

Deno.test("send-giftcard: is a non-idempotent perform whose description warns about spend", () => {
  assertEquals(sendGiftcard.idempotent, false);
  assert(/real money/i.test(sendGiftcard.description ?? ""));
});
