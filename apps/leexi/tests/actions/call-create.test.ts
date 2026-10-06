import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/call-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("call-create: full input maps to POST /calls", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "uuid": "x1" }, "message": "ok" },
  }]);
  const out = await action.execute!({
    "recording_s3_key": "sample-recording_s3_key",
    "external_id": "sample-external_id",
    "direction": "inbound",
    "performed_at": "sample-performed_at",
    "user_uuid": "sample-user_uuid",
    "title": "sample-title",
    "locale": "fr-FR",
    "tags": ["a1", "b2"],
    "customers": [{ "name": "Wei Kemmer", "email": "wei@example.com" }],
    "participating_user_uuids": ["a1", "b2"],
    "custom_fields": { "siret": "0001" },
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://public-api.leexi.ai/v1/calls");
  assertEquals(calls[0].method, "POST");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(JSON.parse(calls[0].body!), {
    "recording_s3_key": "sample-recording_s3_key",
    "external_id": "sample-external_id",
    "direction": "inbound",
    "performed_at": "sample-performed_at",
    "user_uuid": "sample-user_uuid",
    "title": "sample-title",
    "locale": "fr-FR",
    "tags": ["a1", "b2"],
    "customers": [{ "name": "Wei Kemmer", "email": "wei@example.com" }],
    "participating_user_uuids": ["a1", "b2"],
    "custom_fields": { "siret": "0001" },
  });
  assertEquals(out, { "data": { "uuid": "x1" }, "message": "ok" });
});

Deno.test("call-create: required input only maps to POST /calls", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "uuid": "x1" }, "message": "ok" },
  }]);
  const out = await action.execute!({
    "recording_s3_key": "sample-recording_s3_key",
    "external_id": "sample-external_id",
    "direction": "inbound",
    "performed_at": "sample-performed_at",
    "user_uuid": "sample-user_uuid",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://public-api.leexi.ai/v1/calls");
  assertEquals(calls[0].method, "POST");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(JSON.parse(calls[0].body!), {
    "recording_s3_key": "sample-recording_s3_key",
    "external_id": "sample-external_id",
    "direction": "inbound",
    "performed_at": "sample-performed_at",
    "user_uuid": "sample-user_uuid",
  });
  assertEquals(out, { "data": { "uuid": "x1" }, "message": "ok" });
});

Deno.test("call-create: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: {}, message: "ok" } }]);
  await action.execute!({
    "recording_s3_key": "sample-recording_s3_key",
    "external_id": "sample-external_id",
    "direction": "inbound",
    "performed_at": "sample-performed_at",
    "user_uuid": "sample-user_uuid",
    "title": "sample-title",
    "locale": "fr-FR",
    "tags": ["a1", "b2"],
    "customers": [{ "name": "Wei Kemmer", "email": "wei@example.com" }],
    "participating_user_uuids": ["a1", "b2"],
    "custom_fields": { "siret": "0001" },
  }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("call-create: surfaces a JSON error body as a thrown error", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "Name already taken" } }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "recording_s3_key": "sample-recording_s3_key",
        "external_id": "sample-external_id",
        "direction": "inbound",
        "performed_at": "sample-performed_at",
        "user_uuid": "sample-user_uuid",
        "title": "sample-title",
        "locale": "fr-FR",
        "tags": ["a1", "b2"],
        "customers": [{ "name": "Wei Kemmer", "email": "wei@example.com" }],
        "participating_user_uuids": ["a1", "b2"],
        "custom_fields": { "siret": "0001" },
      }, ctx),
    Error,
    "HTTP 422 — Name already taken",
  );
});

Deno.test("call-create: an empty 401 body still reads as an auth failure", async () => {
  const { ctx } = mockCtx([{ status: 401, headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "recording_s3_key": "sample-recording_s3_key",
        "external_id": "sample-external_id",
        "direction": "inbound",
        "performed_at": "sample-performed_at",
        "user_uuid": "sample-user_uuid",
        "title": "sample-title",
        "locale": "fr-FR",
        "tags": ["a1", "b2"],
        "customers": [{ "name": "Wei Kemmer", "email": "wei@example.com" }],
        "participating_user_uuids": ["a1", "b2"],
        "custom_fields": { "siret": "0001" },
      }, ctx),
    Error,
    "HTTP 401 (API key ID/secret missing or invalid)",
  );
});

Deno.test("call-create: declares type, params and output", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.key, "call-create");
  assert(Array.isArray(action.output) && action.output.length > 0);
  assertEquals(action.params!.length, 11);
  assertEquals(action.idempotent, false);
});
