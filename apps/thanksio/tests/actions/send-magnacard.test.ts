import { assert, assertEquals, assertRejects } from "@std/assert";
import sendMagnacard from "../../actions/send-magnacard.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("send-magnacard: calls POST /api/v2/send/magnacard and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{ body: { "message": "Preview", "data": { "images": [] } } }]);
  const out = await sendMagnacard.execute(
    { "mailingListIds": 7, "imageTemplateId": 3, "preview": true } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/send/magnacard");
  assertEquals(new URL(calls[0].url).origin, "https://api.thanks.io");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "mailing_list_ids": [7],
    "image_template_id": 3,
    "preview": true,
  });
  assert(
    out.orderId === undefined && (out.order as Record<string, unknown>).message === "Preview",
    JSON.stringify(out),
  );
});

Deno.test("send-magnacard: a vendor error surfaces the HTTP status and message", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { "message": "API access has been temporarily disabled" },
  }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        sendMagnacard.execute(
          { "mailingListIds": 7, "imageTemplateId": 3, "preview": true } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(
    err.message.includes("HTTP 402") && err.message.includes("temporarily disabled"),
    err.message,
  );
});

Deno.test("send-magnacard: refuses an order with no audience before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const bad = { "imageTemplateId": 3, "preview": true };
  await assertRejects(
    () => Promise.resolve(sendMagnacard.execute(bad as never, ctx)),
    Error,
    "no audience",
  );
  assertEquals(calls.length, 0);
});

Deno.test("send-magnacard: is a non-idempotent perform whose description warns about spend", () => {
  assertEquals(sendMagnacard.idempotent, false);
  assert(/real money/i.test(sendMagnacard.description ?? ""));
});
