import { assertEquals } from "@std/assert";
import { mockPardotCtx } from "../_helpers.ts";
import api from "../../health/api.ts";

Deno.test("api: is unsigned, per connection", () => {
  assertEquals(api.credential, "context");
  assertEquals(api.scope, "connection");
  assertEquals(api.kind, "dependency");
});

Deno.test("api: a schema-correct 401 is a PASS, and no credential header is sent", async () => {
  const { ctx, calls } = mockPardotCtx([{
    status: 401,
    body: { code: 49, message: "Access Denied" },
  }]);
  const r = await api.check!({} as never, ctx);
  assertEquals(r.state, "ok");
  assertEquals(new URL(calls[0].url).host, "pi.pardot.com");
  assertEquals(Object.keys(calls[0].headers), ["accept"]);
});

Deno.test("api: probes the demo host for a demo connection", async () => {
  const { ctx, calls } = mockPardotCtx([{
    status: 401,
    body: { code: 49, message: "Access Denied" },
  }], "pi.demo.pardot.com");
  await api.check!({} as never, ctx);
  assertEquals(new URL(calls[0].url).host, "pi.demo.pardot.com");
});

Deno.test("api: a 5xx is down; an HTML shell is down; a foreign JSON body is unknown", async () => {
  assertEquals(
    (await api.check!({} as never, mockPardotCtx([{ status: 502, body: "x" }]).ctx)).state,
    "down",
  );
  assertEquals(
    (await api.check!({} as never, mockPardotCtx([{ status: 200, body: "<html>spa</html>" }]).ctx))
      .state,
    "down",
  );
  assertEquals(
    (await api.check!({} as never, mockPardotCtx([{ status: 200, body: { ok: true } }]).ctx)).state,
    "unknown",
  );
});

Deno.test("api: a connection with a bad recorded host is unknown, with no request", async () => {
  const { ctx, calls } = mockPardotCtx([], "evil.example.com");
  assertEquals((await api.check!({} as never, ctx)).state, "unknown");
  assertEquals(calls.length, 0);
});
