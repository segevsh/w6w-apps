import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/client-company-update.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client-company-update: full input maps to PATCH /reseller/companies/{uuid}", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "uuid": "x1" }, "message": "ok" },
  }]);
  const out = await action.execute!({
    "uuid": "11111111-aaaa",
    "name": "sample-name",
    "trial_end": 1767222000,
    "license_category": "free",
    "active": true,
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
  assertEquals(
    url.origin + url.pathname,
    "https://public-api.leexi.ai/v1/reseller/companies/11111111-aaaa",
  );
  assertEquals(calls[0].method, "PATCH");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "sample-name",
    "trial_end": 1767222000,
    "industry": "sample-industry",
    "reseller_external_id": "sample-reseller_external_id",
    "subscription_currency": "sample-subscription_currency",
    "subscription_interval": "month",
    "active": true,
    "company_setting": { "license_category": "free", "min_seats": 5, "max_seats": 5 },
    "setting": { "locale": "sample-locale", "time_zone": "sample-time_zone" },
  });
  assertEquals(out, { "data": { "uuid": "x1" }, "message": "ok" });
});

Deno.test("client-company-update: required input only maps to PATCH /reseller/companies/{uuid}", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "uuid": "x1" }, "message": "ok" },
  }]);
  const out = await action.execute!({ "uuid": "11111111-aaaa" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.origin + url.pathname,
    "https://public-api.leexi.ai/v1/reseller/companies/11111111-aaaa",
  );
  assertEquals(calls[0].method, "PATCH");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(out, { "data": { "uuid": "x1" }, "message": "ok" });
});

Deno.test("client-company-update: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: {}, message: "ok" } }]);
  await action.execute!({
    "uuid": "11111111-aaaa",
    "name": "sample-name",
    "trial_end": 1767222000,
    "license_category": "free",
    "active": true,
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

Deno.test("client-company-update: surfaces a JSON error body as a thrown error", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "Name already taken" } }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "uuid": "11111111-aaaa",
        "name": "sample-name",
        "trial_end": 1767222000,
        "license_category": "free",
        "active": true,
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

Deno.test("client-company-update: an empty 401 body still reads as an auth failure", async () => {
  const { ctx } = mockCtx([{ status: 401, headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "uuid": "11111111-aaaa",
        "name": "sample-name",
        "trial_end": 1767222000,
        "license_category": "free",
        "active": true,
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

Deno.test("client-company-update: declares type, params and output", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.key, "client-company-update");
  assert(Array.isArray(action.output) && action.output.length > 0);
  assertEquals(action.params!.length, 13);
  assertEquals(action.idempotent, true);
});
