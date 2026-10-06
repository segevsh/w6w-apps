import { assertEquals } from "@std/assert";
import check from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("api: unsigned, and the INVALID_API_KEY error body is a pass", async () => {
  assertEquals(check.credential, "none");
  const { ctx, calls } = mockCtx([{
    status: 400,
    body: { error: true, error_code: "INVALID_API_KEY" },
  }]);
  assertEquals((await check.check!({}, ctx)).state, "ok");
  assertEquals(calls[0].url, "https://api.prospeo.io/account-information");
  assertEquals(calls[0].headers["x-key"], undefined);
});

Deno.test("api: 5xx is down; an HTML 400 or a 200 is degraded, not ok", async () => {
  assertEquals((await check.check!({}, mockCtx([{ status: 502, body: "bad" }]).ctx)).state, "down");
  assertEquals(
    (await check.check!({}, mockCtx([{ status: 400, body: "<html>" }]).ctx)).state,
    "degraded",
  );
  assertEquals(
    (await check.check!({}, mockCtx([{ body: { error: false } }]).ctx)).state,
    "degraded",
  );
});

Deno.test("api: a network failure is down", async () => {
  const ctx = { fetch: () => Promise.reject(new Error("dns")), log: () => {} };
  assertEquals((await check.check!({}, ctx as never)).state, "down");
});
