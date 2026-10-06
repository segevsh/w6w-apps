import { assert, assertEquals, assertRejects } from "@std/assert";
import estimateOrder from "../../actions/estimate-order.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("estimate-order: calls POST /api/v2/estimate/notecard and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "message": "Estimate",
      "data": { "type": "notecard", "total_recipients": 3, "test_mode": true },
    },
  }]);
  const out = await estimateOrder.execute(
    { "mailerType": "notecard", "mailingListIds": "5", "imageTemplateId": 4 } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/estimate/notecard");
  assertEquals(new URL(calls[0].url).origin, "https://api.thanks.io");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), { "mailing_list_ids": [5], "image_template_id": 4 });
  assert(
    (out.estimate as Record<string, unknown>).total_recipients === 3 && out.message === "Estimate",
    JSON.stringify(out),
  );
});

Deno.test("estimate-order: a vendor error surfaces the HTTP status and message", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { "message": "x", "errors": { "a": ["bad"] } } }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        estimateOrder.execute(
          { "mailerType": "notecard", "mailingListIds": "5", "imageTemplateId": 4 } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(err.message.includes("HTTP 422") && err.message.includes("a: bad"), err.message);
});

Deno.test("estimate-order: refuses an order with no audience before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const bad = { "mailerType": "notecard", "imageTemplateId": 4 };
  await assertRejects(
    () => Promise.resolve(estimateOrder.execute(bad as never, ctx)),
    Error,
    "no audience",
  );
  assertEquals(calls.length, 0);
});

Deno.test("estimate-order: rejects an unknown mailer type before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        estimateOrder.execute({ mailerType: "banner", mailingListIds: "1" } as never, ctx),
      ),
    Error,
    "Mailer type",
  );
  assertEquals(calls.length, 0);
});

Deno.test("estimate-order: is a free read, not a perform", () => {
  assertEquals(estimateOrder.type, "read");
  assert(/nothing is charged/i.test(estimateOrder.description ?? ""));
});
