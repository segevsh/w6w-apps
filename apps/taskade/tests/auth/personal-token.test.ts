import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/personal-token.ts";
import { mockCtx } from "../_helpers.ts";

const credential = { accessToken: " tok123 " };
const unauthorized = {
  ok: false,
  message: "Unauthorized",
  code: "UNAUTHORIZED",
  statusMessage: "Unauthorized",
};

Deno.test("auth: sign sets a trimmed Bearer header", async () => {
  const { ctx } = mockCtx();
  const req = await auth.sign!(
    {
      request: { url: "https://www.taskade.com/api/v1/workspaces", method: "GET", headers: {} },
      credential,
    },
    ctx,
  );
  assertEquals(req.headers["authorization"], "Bearer tok123");
});

Deno.test("auth: test passes on the ok envelope and probes GET /workspaces", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, items: [{ id: "w", name: "Home" }] } }]);
  assertEquals(await auth.test!({ credential }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://www.taskade.com/api/v1/workspaces");
  assertEquals(calls[0].headers["authorization"], "Bearer tok123");
});

Deno.test("auth: test rejects UNAUTHORIZED, SPA-ish 200s, 429 and 5xx", async () => {
  for (
    const [res, want] of [
      [{ status: 401, body: unauthorized }, "rejected the token"],
      [{ status: 200, body: "<html></html>" }, "not Taskade's envelope"],
      [{ status: 429, body: "x" }, "rate-limited"],
      [{ status: 503, body: "x" }, "erroring"],
      [{ status: 403, body: { ok: false, code: "FORBIDDEN", message: "no" } }, "FORBIDDEN"],
    ] as const
  ) {
    const { ctx } = mockCtx([res]);
    const out = await auth.test!({ credential }, ctx);
    assertEquals(out.ok, false);
    assert(out.message!.includes(want), `${want} in ${out.message}`);
  }
});

Deno.test("auth: test refuses an empty credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals((await auth.test!({ credential: { accessToken: " " } }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("auth: afterConnect labels the connection with the first workspace", async () => {
  const { ctx } = mockCtx([{ body: { ok: true, items: [{ id: "w", name: "Home" }] } }]);
  assertEquals(await auth.afterConnect!({ credential }, ctx), { user: "Home" });
  const bad = mockCtx([{ status: 401, body: unauthorized }]);
  assertEquals(await auth.afterConnect!({ credential }, bad.ctx), { user: "Taskade" });
});
