import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/client-company-deactivate.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client-company-deactivate: full input maps to DELETE /reseller/companies/{uuid}", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "uuid": "x1" }, "message": "ok" },
  }]);
  const out = await action.execute!({ "uuid": "11111111-aaaa" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.origin + url.pathname,
    "https://public-api.leexi.ai/v1/reseller/companies/11111111-aaaa",
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(calls[0].body, null);
  assertEquals(out, { "data": { "uuid": "x1" }, "message": "ok" });
});

Deno.test("client-company-deactivate: required input only maps to DELETE /reseller/companies/{uuid}", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "uuid": "x1" }, "message": "ok" },
  }]);
  const out = await action.execute!({ "uuid": "11111111-aaaa" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.origin + url.pathname,
    "https://public-api.leexi.ai/v1/reseller/companies/11111111-aaaa",
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(calls[0].body, null);
  assertEquals(out, { "data": { "uuid": "x1" }, "message": "ok" });
});

Deno.test("client-company-deactivate: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: {}, message: "ok" } }]);
  await action.execute!({ "uuid": "11111111-aaaa" }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("client-company-deactivate: surfaces a JSON error body as a thrown error", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "Name already taken" } }]);
  await assertRejects(
    async () => await action.execute!({ "uuid": "11111111-aaaa" }, ctx),
    Error,
    "HTTP 422 — Name already taken",
  );
});

Deno.test("client-company-deactivate: an empty 401 body still reads as an auth failure", async () => {
  const { ctx } = mockCtx([{ status: 401, headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () => await action.execute!({ "uuid": "11111111-aaaa" }, ctx),
    Error,
    "HTTP 401 (API key ID/secret missing or invalid)",
  );
});

Deno.test("client-company-deactivate: declares type, params and output", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.key, "client-company-deactivate");
  assert(Array.isArray(action.output) && action.output.length > 0);
  assertEquals(action.params!.length, 1);
  assertEquals(action.idempotent, true);
});
