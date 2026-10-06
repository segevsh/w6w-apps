import { assertEquals } from "@std/assert";
import auth from "../../auth/api-token.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("api-token: sign sets X-API-Token", () => {
  const req = {
    url: "https://api.mixmax.com/v1/users/me",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = auth.sign!({ request: req, credential: { apiToken: "tok" } } as never, mockCtx().ctx);
  assertEquals((out as typeof req).headers["x-api-token"], "tok");
});

Deno.test("api-token: test passes on a user id and never sends it elsewhere", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "u1" } }]);
  assertEquals(await auth.test!({ credential: { apiToken: "tok" } } as never, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.mixmax.com/v1/users/me");
  assertEquals(calls[0].headers["x-api-token"], "tok");
});

Deno.test("api-token: a rejected token surfaces Mixmax's message from the body", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Invalid API token provided" } }]);
  assertEquals(await auth.test!({ credential: { apiToken: "bad" } } as never, ctx), {
    ok: false,
    message: "Invalid API token provided",
  });
});

Deno.test("api-token: a 200 without a user id and a non-error body both fail", async () => {
  const a = mockCtx([{ body: { hello: 1 } }]);
  assertEquals((await auth.test!({ credential: { apiToken: "t" } } as never, a.ctx)).ok, false);
  const b = mockCtx([{ status: 401, body: "<html>" }]);
  assertEquals((await auth.test!({ credential: { apiToken: "t" } } as never, b.ctx)).ok, false);
  const c = mockCtx([]);
  assertEquals((await auth.test!({ credential: {} } as never, c.ctx)).ok, false);
});
