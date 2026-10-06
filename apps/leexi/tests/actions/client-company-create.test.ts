import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/client-company-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client-company-create: full input maps to POST /reseller/companies", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "uuid": "x1" }, "message": "ok" },
  }]);
  const out = await action.execute!({
    "name": "sample-name",
    "trial_end": 1767222000,
    "license_category": "free",
    "industry": "sample-industry",
    "reseller_external_id": "sample-reseller_external_id",
    "subscription_currency": "sample-subscription_currency",
    "subscription_interval": "month",
    "min_seats": 5,
    "max_seats": 5,
    "locale": "sample-locale",
    "time_zone": "sample-time_zone",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://public-api.leexi.ai/v1/reseller/companies");
  assertEquals(calls[0].method, "POST");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "sample-name",
    "trial_end": 1767222000,
    "industry": "sample-industry",
    "reseller_external_id": "sample-reseller_external_id",
    "subscription_currency": "sample-subscription_currency",
    "subscription_interval": "month",
    "company_setting": { "license_category": "free", "min_seats": 5, "max_seats": 5 },
    "setting": { "locale": "sample-locale", "time_zone": "sample-time_zone" },
  });
  assertEquals(out, { "data": { "uuid": "x1" }, "message": "ok" });
});

Deno.test("client-company-create: required input only maps to POST /reseller/companies", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "uuid": "x1" }, "message": "ok" },
  }]);
  const out = await action.execute!({
    "name": "sample-name",
    "trial_end": 1767222000,
    "license_category": "free",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://public-api.leexi.ai/v1/reseller/companies");
  assertEquals(calls[0].method, "POST");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "sample-name",
    "trial_end": 1767222000,
    "company_setting": { "license_category": "free" },
  });
  assertEquals(out, { "data": { "uuid": "x1" }, "message": "ok" });
});

Deno.test("client-company-create: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: {}, message: "ok" } }]);
  await action.execute!({
    "name": "sample-name",
    "trial_end": 1767222000,
    "license_category": "free",
    "industry": "sample-industry",
    "reseller_external_id": "sample-reseller_external_id",
    "subscription_currency": "sample-subscription_currency",
    "subscription_interval": "month",
    "min_seats": 5,
    "max_seats": 5,
    "locale": "sample-locale",
    "time_zone": "sample-time_zone",
  }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("client-company-create: surfaces a JSON error body as a thrown error", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "Name already taken" } }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "name": "sample-name",
        "trial_end": 1767222000,
        "license_category": "free",
        "industry": "sample-industry",
        "reseller_external_id": "sample-reseller_external_id",
        "subscription_currency": "sample-subscription_currency",
        "subscription_interval": "month",
        "min_seats": 5,
        "max_seats": 5,
        "locale": "sample-locale",
        "time_zone": "sample-time_zone",
      }, ctx),
    Error,
    "HTTP 422 — Name already taken",
  );
});

Deno.test("client-company-create: an empty 401 body still reads as an auth failure", async () => {
  const { ctx } = mockCtx([{ status: 401, headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "name": "sample-name",
        "trial_end": 1767222000,
        "license_category": "free",
        "industry": "sample-industry",
        "reseller_external_id": "sample-reseller_external_id",
        "subscription_currency": "sample-subscription_currency",
        "subscription_interval": "month",
        "min_seats": 5,
        "max_seats": 5,
        "locale": "sample-locale",
        "time_zone": "sample-time_zone",
      }, ctx),
    Error,
    "HTTP 401 (API key ID/secret missing or invalid)",
  );
});

Deno.test("client-company-create: declares type, params and output", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.key, "client-company-create");
  assert(Array.isArray(action.output) && action.output.length > 0);
  assertEquals(action.params!.length, 11);
  assertEquals(action.idempotent, false);
});
