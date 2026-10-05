import { assert, assertEquals, assertRejects } from "@std/assert";
import updateDelivery from "../../actions/update-delivery.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "updateDelivery";
const DATA = { "ok": "Y" };

Deno.test("update-delivery: calls updateDelivery with POST and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await updateDelivery.execute({ "delivery_id": 55 }, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "POST");
  assertEquals(fieldsOf(calls[0]), { "delivery_id": "55" });
  assertEquals(out, DATA);
});

Deno.test("update-delivery: sends every optional field under the vendor's wire name", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await updateDelivery.execute({
    "delivery_id": 55,
    "notify_via_email": false,
    "type": "delivery",
    "is_shipped": true,
    "quantity_delivered": 2,
    "add_quantity_delivered": 1,
    "is_shipped_by_reseller_from": "fc1",
    "tracking": [{ "parcel_service": "dhl", "tracking_id": "123" }],
  }, ctx);
  assertEquals(fieldsOf(calls[0]), {
    "delivery_id": "55",
    "notify_via_email": "N",
    "data[type]": "delivery",
    "data[is_shipped]": "Y",
    "data[quantity_delivered]": "2",
    "data[add_quantity_delivered]": "1",
    "data[is_shipped_by_reseller_from]": "fc1",
    "tracking[0][parcel_service]": "dhl",
    "tracking[0][tracking_id]": "123",
  });
});

Deno.test("update-delivery: form-encodes the body and never puts arguments in the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await updateDelivery.execute({
    "delivery_id": 55,
    "notify_via_email": false,
    "type": "delivery",
    "is_shipped": true,
    "quantity_delivered": 2,
    "add_quantity_delivered": 1,
    "is_shipped_by_reseller_from": "fc1",
    "tracking": [{ "parcel_service": "dhl", "tracking_id": "123" }],
  }, ctx);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
  assert(!("x-ds-api-key" in calls[0].headers), "credential must come from sign, not the action");
});

Deno.test("update-delivery: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () => await updateDelivery.execute({ "delivery_id": 55 }, ctx),
    Error,
    "The API key is invalid.",
  );
});

Deno.test("update-delivery: declares idempotency as true", () => {
  assertEquals(updateDelivery.idempotent, true);
});
