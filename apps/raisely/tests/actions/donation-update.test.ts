import { assertEquals } from "@std/assert";
import donationUpdate from "../../actions/donation-update.ts";
import { bodyOf, envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("donation-update: PATCH /v3/donations/d-1 with the documented wrapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ uuid: "r-1" }) }]);
  const out = await donationUpdate.execute({
    "uuid": "d-1",
    "message": "hi",
    "anonymous": true,
    "thankyouMessage": "thanks",
    "thankyouIsPrivate": false,
  }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v3/donations/d-1");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(bodyOf(calls[0]), {
    "data": {
      "message": "hi",
      "anonymous": true,
      "thankyou": { "message": "thanks", "isPrivate": false },
    },
  });
  assertEquals(out, { uuid: "r-1" });
});

Deno.test("donation-update: is a perform action marked idempotent=true", () => {
  assertEquals(donationUpdate.type, "perform");
  assertEquals(donationUpdate.idempotent, true);
});

Deno.test("donation-update: only the fields given are sent", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await donationUpdate.execute({ "uuid": "d" }, ctx);
  assertEquals(bodyOf(calls[0]), { "data": {} });
});

Deno.test("donation-update: malformed JSON in a custom-field param fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await donationUpdate.execute({
      "uuid": "d-1",
      "message": "hi",
      "anonymous": true,
      "thankyouMessage": "thanks",
      "thankyouIsPrivate": false,
      public: "{not json",
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "public is not valid JSON");
  assertEquals(calls.length, 0);
});

Deno.test("donation-update: an HTTP error becomes a readable Raisely error", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "unauthorized", detail: "You must login again" },
  }]);
  let message = "";
  try {
    await donationUpdate.execute({
      "uuid": "d-1",
      "message": "hi",
      "anonymous": true,
      "thankyouMessage": "thanks",
      "thankyouIsPrivate": false,
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Raisely 401"), true, message);
  assertEquals(message.includes("You must login again"), true, message);
});
