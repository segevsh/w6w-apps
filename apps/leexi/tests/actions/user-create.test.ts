import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/user-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("user-create: full input maps to POST /users", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "uuid": "x1" }, "message": "ok" },
  }]);
  const out = await action.execute!({
    "name": "sample-name",
    "email": "sample-email",
    "team_uuid": "sample-team_uuid",
    "license": "sample-license",
    "roles": ["a1", "b2"],
    "active": true,
    "send_welcome_email": true,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://public-api.leexi.ai/v1/users");
  assertEquals(calls[0].method, "POST");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "sample-name",
    "email": "sample-email",
    "team_uuid": "sample-team_uuid",
    "license": "sample-license",
    "roles": ["a1", "b2"],
    "active": true,
    "send_welcome_email": true,
  });
  assertEquals(out, { "data": { "uuid": "x1" }, "message": "ok" });
});

Deno.test("user-create: required input only maps to POST /users", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "uuid": "x1" }, "message": "ok" },
  }]);
  const out = await action.execute!({
    "name": "sample-name",
    "email": "sample-email",
    "team_uuid": "sample-team_uuid",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://public-api.leexi.ai/v1/users");
  assertEquals(calls[0].method, "POST");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "sample-name",
    "email": "sample-email",
    "team_uuid": "sample-team_uuid",
  });
  assertEquals(out, { "data": { "uuid": "x1" }, "message": "ok" });
});

Deno.test("user-create: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: {}, message: "ok" } }]);
  await action.execute!({
    "name": "sample-name",
    "email": "sample-email",
    "team_uuid": "sample-team_uuid",
    "license": "sample-license",
    "roles": ["a1", "b2"],
    "active": true,
    "send_welcome_email": true,
  }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("user-create: surfaces a JSON error body as a thrown error", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "Name already taken" } }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "name": "sample-name",
        "email": "sample-email",
        "team_uuid": "sample-team_uuid",
        "license": "sample-license",
        "roles": ["a1", "b2"],
        "active": true,
        "send_welcome_email": true,
      }, ctx),
    Error,
    "HTTP 422 — Name already taken",
  );
});

Deno.test("user-create: an empty 401 body still reads as an auth failure", async () => {
  const { ctx } = mockCtx([{ status: 401, headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "name": "sample-name",
        "email": "sample-email",
        "team_uuid": "sample-team_uuid",
        "license": "sample-license",
        "roles": ["a1", "b2"],
        "active": true,
        "send_welcome_email": true,
      }, ctx),
    Error,
    "HTTP 401 (API key ID/secret missing or invalid)",
  );
});

Deno.test("user-create: declares type, params and output", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.key, "user-create");
  assert(Array.isArray(action.output) && action.output.length > 0);
  assertEquals(action.params!.length, 7);
  assertEquals(action.idempotent, false);
});
