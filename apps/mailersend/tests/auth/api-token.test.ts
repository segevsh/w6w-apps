import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/api-token.ts";
import { mockCtx } from "../_helpers.ts";

const cred = { apiToken: "mlsn.secret-token" };

Deno.test("api-token: sign sets a Bearer header and nothing else", () => {
  const req = {
    url: "https://api.mailersend.com/v1/domains",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = auth.sign!({ request: req, credential: cred } as never, {} as never) as typeof req;
  assertEquals(out.headers["authorization"], "Bearer mlsn.secret-token");
  assertEquals(Object.keys(out.headers), ["authorization"]);
});

Deno.test("api-token: test passes on 200 with a data array and probes /v1/domains", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  const r = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(r.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/v1/domains");
  assertEquals(calls[0].headers["authorization"], "Bearer mlsn.secret-token");
});

Deno.test("api-token: a 200 that is not { data: [...] } fails", async () => {
  const { ctx } = mockCtx([{ body: "<html>proxy</html>" }]);
  assertEquals((await auth.test!({ credential: cred } as never, ctx)).ok, false);
});

Deno.test("api-token: 403 MS40301 (missing scope) and 429 prove a live token", async () => {
  const a = mockCtx([{ status: 403, body: { message: "This action is unauthorized. #MS40301" } }]);
  const ra = await auth.test!({ credential: cred } as never, a.ctx);
  assertEquals(ra.ok, true);
  const b = mockCtx([{ status: 429, body: { message: "slow down" } }]);
  assertEquals((await auth.test!({ credential: cred } as never, b.ctx)).ok, true);
});

Deno.test("api-token: 401 fails and the message never echoes the token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Unauthenticated." } }]);
  const r = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(r.ok, false);
  assert(!JSON.stringify(r).includes("mlsn.secret-token"));
});

Deno.test("api-token: other 403s and 5xx fail; 5xx is not a verdict on the token", async () => {
  const a = mockCtx([{ status: 403, body: { message: "Your account is suspended. #MS40302" } }]);
  assertEquals((await auth.test!({ credential: cred } as never, a.ctx)).ok, false);
  const b = mockCtx([{ status: 503, body: "oops" }]);
  const r = await auth.test!({ credential: cred } as never, b.ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("not judged"));
});

Deno.test("api-token: a missing token fails without any request; a network error fails", async () => {
  const a = mockCtx([]);
  assertEquals((await auth.test!({ credential: {} } as never, a.ctx)).ok, false);
  assertEquals(a.calls.length, 0);
  const b = mockCtx([]); // unqueued fetch throws
  assertEquals((await auth.test!({ credential: cred } as never, b.ctx)).ok, false);
});
