import { assertEquals } from "@std/assert";
import donationCreate from "../../actions/donation-create.ts";
import { bodyOf, envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("donation-create: POST /v3/donations with the documented wrapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ uuid: "r-1" }) }]);
  const out = await donationCreate.execute({
    "private": true,
    "email": "d@b.org",
    "amount": 2500,
    "currency": "AUD",
    "type": "OFFLINE",
    "method": "OFFLINE",
    "campaignUuid": "c1",
    "profileUuid": "p1",
    "mode": "LIVE",
    "private_fields": '{"ref":"cheque-1"}',
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/donations");
  assertEquals(queryOf(calls[0].url), { "private": "true" });
  assertEquals(bodyOf(calls[0]), {
    "data": {
      "email": "d@b.org",
      "amount": 2500,
      "currency": "AUD",
      "type": "OFFLINE",
      "method": "OFFLINE",
      "campaignUuid": "c1",
      "profileUuid": "p1",
      "mode": "LIVE",
      "private": { "ref": "cheque-1" },
    },
  });
  assertEquals(out, { uuid: "r-1" });
});

Deno.test("donation-create: is a perform action marked idempotent=false", () => {
  assertEquals(donationCreate.type, "perform");
  assertEquals(donationCreate.idempotent, false);
});

Deno.test("donation-create: only the fields given are sent", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await donationCreate.execute({
    "email": "e@b.org",
    "amount": 100,
    "currency": "USD",
    "type": "OFFLINE",
    "method": "OFFLINE",
  }, ctx);
  assertEquals(bodyOf(calls[0]), {
    "data": {
      "email": "e@b.org",
      "amount": 100,
      "currency": "USD",
      "type": "OFFLINE",
      "method": "OFFLINE",
    },
  });
});

Deno.test("donation-create: malformed JSON in a custom-field param fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await donationCreate.execute({
      "private": true,
      "email": "d@b.org",
      "amount": 2500,
      "currency": "AUD",
      "type": "OFFLINE",
      "method": "OFFLINE",
      "campaignUuid": "c1",
      "profileUuid": "p1",
      "mode": "LIVE",
      "private_fields": '{"ref":"cheque-1"}',
      public: "{not json",
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "public is not valid JSON");
  assertEquals(calls.length, 0);
});

Deno.test("donation-create: an HTTP error becomes a readable Raisely error", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "unauthorized", detail: "You must login again" },
  }]);
  let message = "";
  try {
    await donationCreate.execute({
      "private": true,
      "email": "d@b.org",
      "amount": 2500,
      "currency": "AUD",
      "type": "OFFLINE",
      "method": "OFFLINE",
      "campaignUuid": "c1",
      "profileUuid": "p1",
      "mode": "LIVE",
      "private_fields": '{"ref":"cheque-1"}',
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Raisely 401"), true, message);
  assertEquals(message.includes("You must login again"), true, message);
});
