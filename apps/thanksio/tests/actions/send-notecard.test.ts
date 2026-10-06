import { assert, assertEquals, assertRejects } from "@std/assert";
import sendNotecard from "../../actions/send-notecard.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("send-notecard: calls POST /api/v2/send/notecard and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 42, "status": "reviewing" } }]);
  const out = await sendNotecard.execute(
    {
      "recipients": [{ "mailing_list_id": 1, "name": "Ada", "address": "1 Main St" }],
      "frontImageUrl": "https://x/y.png",
      "useCustomBackground": false,
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/send/notecard");
  assertEquals(new URL(calls[0].url).origin, "https://api.thanks.io");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "recipients": [{ "mailing_list_id": 1, "name": "Ada", "address": "1 Main St" }],
    "front_image_url": "https://x/y.png",
    "use_custom_background": false,
  });
  assert(out.orderId === 42, JSON.stringify(out));
});

Deno.test("send-notecard: a vendor error surfaces the HTTP status and message", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { "message": "Error Submitting Mailer" } }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        sendNotecard.execute(
          {
            "recipients": [{ "mailing_list_id": 1, "name": "Ada", "address": "1 Main St" }],
            "frontImageUrl": "https://x/y.png",
            "useCustomBackground": false,
          } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(
    err.message.includes("HTTP 400") && err.message.includes("Error Submitting Mailer"),
    err.message,
  );
});

Deno.test("send-notecard: refuses an order with no audience before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const bad = { "frontImageUrl": "https://x/y.png", "useCustomBackground": false };
  await assertRejects(
    () => Promise.resolve(sendNotecard.execute(bad as never, ctx)),
    Error,
    "no audience",
  );
  assertEquals(calls.length, 0);
});

Deno.test("send-notecard: is a non-idempotent perform whose description warns about spend", () => {
  assertEquals(sendNotecard.idempotent, false);
  assert(/real money/i.test(sendNotecard.description ?? ""));
});
