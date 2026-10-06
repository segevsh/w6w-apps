import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/client-subscription-cancel.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client-subscription-cancel: full input maps to DELETE /reseller/companies/{company_uuid}/subscription", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "uuid": "x1" }, "message": "ok" },
  }]);
  const out = await action.execute!({ "company_uuid": "cccccccc-0000" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.origin + url.pathname,
    "https://public-api.leexi.ai/v1/reseller/companies/cccccccc-0000/subscription",
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(calls[0].body, null);
  assertEquals(out, { "data": { "uuid": "x1" }, "message": "ok" });
});

Deno.test("client-subscription-cancel: required input only maps to DELETE /reseller/companies/{company_uuid}/subscription", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "uuid": "x1" }, "message": "ok" },
  }]);
  const out = await action.execute!({ "company_uuid": "cccccccc-0000" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.origin + url.pathname,
    "https://public-api.leexi.ai/v1/reseller/companies/cccccccc-0000/subscription",
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(calls[0].body, null);
  assertEquals(out, { "data": { "uuid": "x1" }, "message": "ok" });
});

Deno.test("client-subscription-cancel: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: {}, message: "ok" } }]);
  await action.execute!({ "company_uuid": "cccccccc-0000" }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("client-subscription-cancel: surfaces a JSON error body as a thrown error", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "Name already taken" } }]);
  await assertRejects(
    async () => await action.execute!({ "company_uuid": "cccccccc-0000" }, ctx),
    Error,
    "HTTP 422 — Name already taken",
  );
});

Deno.test("client-subscription-cancel: an empty 401 body still reads as an auth failure", async () => {
  const { ctx } = mockCtx([{ status: 401, headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () => await action.execute!({ "company_uuid": "cccccccc-0000" }, ctx),
    Error,
    "HTTP 401 (API key ID/secret missing or invalid)",
  );
});

Deno.test("client-subscription-cancel: declares type, params and output", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.key, "client-subscription-cancel");
  assert(Array.isArray(action.output) && action.output.length > 0);
  assertEquals(action.params!.length, 1);
  assertEquals(action.idempotent, false);
});
