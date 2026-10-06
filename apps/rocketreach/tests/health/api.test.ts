import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("api: the schema-correct 401 authentication_failed is a pass, unsigned", async () => {
  const { ctx, calls } = mockCtx([{
    status: 401,
    body: {
      detail: "Anonymous requests are not allowed. Please use the test API key.",
      error_code: "authentication_failed",
    },
  }]);
  assertEquals(api.credential, "none");
  assertEquals((await api.check!({}, ctx)).state, "ok");
  assertEquals(calls[0].url, "https://api.rocketreach.co/api/v2/account/");
  assertEquals(calls[0].headers["api-key"], undefined);
});

Deno.test("api: 5xx is down; an unrelated 401 or 404 body is unknown", async () => {
  const down = mockCtx([{ status: 502, body: "bad gateway" }]);
  assertEquals((await api.check!({}, down.ctx)).state, "down");
  const odd = mockCtx([{ status: 401, headers: { "content-type": "text/html" }, body: "<html>" }]);
  assertEquals((await api.check!({}, odd.ctx)).state, "unknown");
  const spa = mockCtx([{ status: 404, headers: { "content-type": "text/html" }, body: "<html>" }]);
  assertEquals((await api.check!({}, spa.ctx)).state, "unknown");
});
