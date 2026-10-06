import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/me-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("me-get: GETs /me and unwraps data", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { id: "org_1", name: "Acme", user: { id: "u1" } }, request_id: "r" },
  }]);
  const out = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.usepylon.com/me");
  assertEquals(calls[0].method, "GET");
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
  assertEquals(out, { id: "org_1", name: "Acme", user: { id: "u1" } });
});

Deno.test("me-get: surfaces Pylon's error with its stable code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { errors: ["Invalid API token!"], request_id: "r", code: "invalid_api_token" },
  }]);
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "HTTP 401 — Invalid API token! (invalid_api_token)",
  );
});
