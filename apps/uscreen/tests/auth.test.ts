import { assertEquals } from "@std/assert";
import apiKey, { PROBE_PATH } from "../auth/api-key.ts";
import { mockCtx, pathOf } from "./_helpers.ts";

// deno-lint-ignore no-explicit-any
const test = (cred: unknown, ctx: any) => (apiKey.test as any)({ credential: cred }, ctx);

Deno.test("auth.sign: stamps the raw key in Authorization, with no prefix, and trims it", () => {
  // deno-lint-ignore no-explicit-any
  const out = (apiKey.sign as any)({
    request: { url: "https://uscreen.io/x", method: "GET", headers: {} },
    credential: { apiKey: "  abc123 " },
  });
  assertEquals(out.headers["authorization"], "abc123");
});

Deno.test("auth.test: a JSON array body is a pass, and the probe is GET /email_topics with the key", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, title: "News" }] }]);
  assertEquals(await test({ apiKey: "k" }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1" + PROBE_PATH);
  assertEquals(calls[0].headers["authorization"], "k");
});

Deno.test("auth.test: classified from the vendor's body, not the status code", async () => {
  // Same body at a surprising status: still a rejection, with the vendor's text.
  const { ctx } = mockCtx([{ status: 200, body: { message: "Invalid private API key" } }]);
  const r = await test({ apiKey: "k" }, ctx);
  assertEquals(r.ok, false);
  assertEquals(r.message.includes("Invalid private API key"), true);

  const html = mockCtx([{ status: 200, body: "<html>shell</html>" }]);
  assertEquals((await test({ apiKey: "k" }, html.ctx)).ok, false);
});

Deno.test("auth.test: a missing key never reaches the network", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await test({}, ctx)).ok, false);
  assertEquals(calls.length, 0);
});
