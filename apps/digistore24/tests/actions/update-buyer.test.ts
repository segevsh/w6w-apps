import { assert, assertEquals, assertRejects } from "@std/assert";
import updateBuyer from "../../actions/update-buyer.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "updateBuyer";
const DATA = { "ok": "Y" };

Deno.test("update-buyer: calls updateBuyer with POST and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await updateBuyer.execute({ "buyer_id": 42 }, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "POST");
  assertEquals(fieldsOf(calls[0]), { "buyer_id": "42" });
  assertEquals(out, DATA);
});

Deno.test("update-buyer: sends every optional field under the vendor's wire name", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await updateBuyer.execute({
    "buyer_id": 42,
    "email": "n@b.com",
    "first_name": "Ann",
    "last_name": "Lee",
    "salutation": "F",
    "title": "Dr",
    "company": "Acme",
    "street_name": "Main St",
    "street_number": "1",
    "phone_number": "123",
    "city": "Berlin",
    "zipcode": "10115",
    "state": "BE",
    "country": "DE",
  }, ctx);
  assertEquals(fieldsOf(calls[0]), {
    "buyer_id": "42",
    "email": "n@b.com",
    "first_name": "Ann",
    "last_name": "Lee",
    "salutation": "F",
    "title": "Dr",
    "company": "Acme",
    "street_name": "Main St",
    "street_number": "1",
    "phone_number": "123",
    "city": "Berlin",
    "zipcode": "10115",
    "state": "BE",
    "country": "DE",
  });
});

Deno.test("update-buyer: form-encodes the body and never puts arguments in the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await updateBuyer.execute({
    "buyer_id": 42,
    "email": "n@b.com",
    "first_name": "Ann",
    "last_name": "Lee",
    "salutation": "F",
    "title": "Dr",
    "company": "Acme",
    "street_name": "Main St",
    "street_number": "1",
    "phone_number": "123",
    "city": "Berlin",
    "zipcode": "10115",
    "state": "BE",
    "country": "DE",
  }, ctx);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
  assert(!("x-ds-api-key" in calls[0].headers), "credential must come from sign, not the action");
});

Deno.test("update-buyer: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () => await updateBuyer.execute({ "buyer_id": 42 }, ctx),
    Error,
    "The API key is invalid.",
  );
});

Deno.test("update-buyer: declares idempotency as true", () => {
  assertEquals(updateBuyer.idempotent, true);
});
