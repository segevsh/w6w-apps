// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "@std/assert";
import auth from "../auth/client-credentials.ts";
import { mockCtx } from "./_helpers.ts";

const cred = { clientId: "ci_abc", clientSecret: "cs_def" };

Deno.test("auth.sign: stamps both headers", async () => {
  const req = {
    url: "https://api.tidio.com/project",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await (auth.sign as any)({ request: req, credential: cred });
  assertEquals(out.headers["x-tidio-openapi-client-id"], "ci_abc");
  assertEquals(out.headers["x-tidio-openapi-client-secret"], "cs_def");
});

Deno.test("auth.test: 200 with project_id is ok, and sends the version header", async () => {
  const { ctx, calls } = mockCtx([{ body: { project_id: 7, status: "online" } }]);
  const r = await (auth.test as any)({ credential: cred }, ctx);
  assertEquals(r.ok, true);
  assertEquals(calls[0].url, "https://api.tidio.com/project");
  assertEquals(calls[0].headers.accept, "application/json; version=1");
});

Deno.test("auth.test: classifies by vendor error code, not status", async () => {
  const t = auth.test as any;
  const bad = mockCtx([{
    status: 401,
    body: { errors: [{ code: "unauthorized", message: "x" }] },
  }]);
  const r1 = await t({ credential: cred }, bad.ctx);
  assertEquals(r1.ok, false);
  assertEquals(r1.message.includes("rejected"), true);
  const plan = mockCtx([{
    status: 403,
    body: { errors: [{ code: "api_access_disabled", message: "x" }] },
  }]);
  const r2 = await t({ credential: cred }, plan.ctx);
  assertEquals(r2.message.includes("Plus"), true);
  const odd = mockCtx([{ status: 200, body: { hello: "world" } }]);
  assertEquals((await t({ credential: cred }, odd.ctx)).ok, false);
});

Deno.test("auth.test: a missing half of the pair fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const r = await (auth.test as any)({ credential: { clientId: "ci_x" } }, ctx);
  assertEquals(r.ok, false);
  assertEquals(calls.length, 0);
});
