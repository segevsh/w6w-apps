import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

// deno-lint-ignore no-explicit-any
const run = (ctx: any) => api.check!({} as any, ctx);

Deno.test("api: declared unsigned dependency check", () => {
  assertEquals(api.credential, "none");
  assertEquals(api.kind, "dependency");
});

Deno.test("api: the 401 Access denied body is a PASS and no credential is sent", async () => {
  const { ctx, calls } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "HTTP Token: Access denied.\n",
  }]);
  assertEquals((await run(ctx)).state, "ok");
  assertEquals(calls[0].url, "https://api.moonclerk.com/forms?count=1");
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("api: a 5xx is down", async () => {
  assertEquals((await run(mockCtx([{ status: 502, body: "bad gateway" }]).ctx)).state, "down");
});

Deno.test("api: a network error is down", async () => {
  const boom = { fetch: () => Promise.reject(new Error("dns")), log: () => {} };
  assertEquals((await run(boom)).state, "down");
});

Deno.test("api: a 200 HTML shell or foreign 401 is degraded, not ok", async () => {
  assertEquals(
    (await run(mockCtx([{ status: 200, body: "<html>hi</html>" }]).ctx)).state,
    "degraded",
  );
  assertEquals((await run(mockCtx([{ status: 401, body: "nope" }]).ctx)).state, "degraded");
});
