import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

const AUTH = {
  data: null,
  errors: [{
    message:
      "Authentication credentials are missing. Authorization header is required and must contain a value.",
    extensions: { errorClass: "AUTHENTICATION", errorType: "developer_error" },
  }],
};

Deno.test("api: unsigned, connection-scoped dependency check", () => {
  assertEquals([api.kind, api.scope, api.credential], ["dependency", "connection", "context"]);
});

Deno.test("api: the documented AUTHENTICATION error is a pass, sent with no credential", async () => {
  const { ctx, calls } = mockCtx([{ body: AUTH }]);
  assertEquals((await api.check!({}, ctx)).state, "ok");
  assertEquals(calls[0].url, "https://payments.braintree-api.com/graphql");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("api: follows the connection's environment", async () => {
  const { ctx, calls } = mockCtx([{ body: AUTH }]);
  (ctx as { connection?: unknown }).connection = { display: { environment: "sandbox" } };
  await api.check!({}, ctx);
  assertEquals(calls[0].url, "https://payments.sandbox.braintree-api.com/graphql");
});

Deno.test("api: 5xx, HTML and SERVICE_AVAILABILITY are down", async () => {
  assertEquals((await api.check!({}, mockCtx([{ status: 503, body: "x" }]).ctx)).state, "down");
  const html = mockCtx([{ body: "<html></html>", headers: { "content-type": "text/html" } }]);
  assertEquals((await api.check!({}, html.ctx)).state, "down");
  const sa = {
    data: null,
    errors: [{ message: "unavailable", extensions: { errorClass: "SERVICE_AVAILABILITY" } }],
  };
  assertEquals((await api.check!({}, mockCtx([{ body: sa }]).ctx)).state, "down");
});

Deno.test("api: an unrecognised JSON answer is unknown, never ok", async () => {
  assertEquals(
    (await api.check!({}, mockCtx([{ body: { hello: "world" } }]).ctx)).state,
    "unknown",
  );
});

Deno.test("api: a network failure is down", async () => {
  const ctx = { fetch: () => Promise.reject(new Error("tls")), log: () => {} } as never;
  assertEquals((await api.check!({}, ctx)).state, "down");
});
