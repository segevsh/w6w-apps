import { assertEquals } from "@std/assert";
import api, { PROBE_URL } from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

const text = { "content-type": "text/plain" };

Deno.test("api: probes /self unsigned and a plain Unauthorized is a pass", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, headers: text, body: "Unauthorized" }]);
  const r = await api.check!({}, ctx);
  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(r.state, "ok");
});

Deno.test("api: a JSON auth error envelope is also a pass", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: { key: "Unauthorized", code: 401 } } }]);
  assertEquals((await api.check!({}, ctx)).state, "ok");
});

Deno.test("api: a 401 carrying an HTML page is degraded, not ok", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/html" },
    body: "<html>login",
  }]);
  assertEquals((await api.check!({}, ctx)).state, "degraded");
});

Deno.test("api: a 200 to an unsigned call is degraded (not the API)", async () => {
  const { ctx } = mockCtx([{ headers: { "content-type": "text/html" }, body: "<html>app</html>" }]);
  assertEquals((await api.check!({}, ctx)).state, "degraded");
});

Deno.test("api: 5xx is down, 429 is degraded", async () => {
  assertEquals(
    (await api.check!({}, mockCtx([{ status: 502, body: "bad gateway" }]).ctx)).state,
    "down",
  );
  assertEquals((await api.check!({}, mockCtx([{ status: 429, body: "x" }]).ctx)).state, "degraded");
});

Deno.test("api: a network failure is down", async () => {
  const ctx = { fetch: () => Promise.reject(new Error("dns")), log: () => {} };
  const r = await api.check!({}, ctx as never);
  assertEquals(r.state, "down");
});
