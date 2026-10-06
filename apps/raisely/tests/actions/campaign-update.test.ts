import { assertEquals } from "@std/assert";
import campaignUpdate from "../../actions/campaign-update.ts";
import { bodyOf, envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-update: PATCH /v3/campaigns/spring-appeal with the documented wrapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ uuid: "r-1" }) }]);
  const out = await campaignUpdate.execute({
    "campaign": "spring-appeal",
    "private": true,
    "name": "Spring",
    "goal": 500000,
    "mode": "LIVE",
    "allowExperiments": false,
    "urls": '["a.example.org"]',
    "public": '{"k":"v"}',
    "private_fields": { "secret": 1 },
    "overwriteCustomFields": true,
  }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v3/campaigns/spring-appeal");
  assertEquals(queryOf(calls[0].url), { "private": "true" });
  assertEquals(bodyOf(calls[0]), {
    "data": {
      "name": "Spring",
      "goal": 500000,
      "mode": "LIVE",
      "allowExperiments": false,
      "urls": ["a.example.org"],
      "public": { "k": "v" },
      "private": { "secret": 1 },
    },
    "overwriteCustomFields": true,
  });
  assertEquals(out, { uuid: "r-1" });
});

Deno.test("campaign-update: is a perform action marked idempotent=true", () => {
  assertEquals(campaignUpdate.type, "perform");
  assertEquals(campaignUpdate.idempotent, true);
});

Deno.test("campaign-update: only the fields given are sent", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await campaignUpdate.execute({ "campaign": "c" }, ctx);
  assertEquals(bodyOf(calls[0]), { "data": {} });
});

Deno.test("campaign-update: malformed JSON in a custom-field param fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await campaignUpdate.execute({
      "campaign": "spring-appeal",
      "private": true,
      "name": "Spring",
      "goal": 500000,
      "mode": "LIVE",
      "allowExperiments": false,
      "urls": '["a.example.org"]',
      "private_fields": { "secret": 1 },
      "overwriteCustomFields": true,
      public: "{not json",
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "public is not valid JSON");
  assertEquals(calls.length, 0);
});

Deno.test("campaign-update: an HTTP error becomes a readable Raisely error", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "unauthorized", detail: "You must login again" },
  }]);
  let message = "";
  try {
    await campaignUpdate.execute({
      "campaign": "spring-appeal",
      "private": true,
      "name": "Spring",
      "goal": 500000,
      "mode": "LIVE",
      "allowExperiments": false,
      "urls": '["a.example.org"]',
      "public": '{"k":"v"}',
      "private_fields": { "secret": 1 },
      "overwriteCustomFields": true,
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Raisely 401"), true, message);
  assertEquals(message.includes("You must login again"), true, message);
});
