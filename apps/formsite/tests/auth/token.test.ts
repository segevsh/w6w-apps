import { assertEquals } from "@std/assert";
import auth from "../../auth/token.ts";
import { mockCtx } from "../_helpers.ts";

const credential = { server: "fs3", userDir: "acme", token: "tok" };

Deno.test("auth: sign sets a bearer Authorization header", async () => {
  const req = { url: "https://fs3.formsite.com/api/v2/acme/forms", method: "GET", headers: {} };
  // deno-lint-ignore no-explicit-any
  const out = await (auth.sign as any)({ request: req, credential });
  assertEquals(out.headers["authorization"], "bearer tok");
});

Deno.test("auth: test passes on 200 and probes the forms list", async () => {
  const { ctx, calls } = mockCtx([{ body: { forms: [] } }]);
  // deno-lint-ignore no-explicit-any
  const res = await (auth.test as any)({ credential }, ctx);
  assertEquals(res, { ok: true });
  assertEquals(calls[0].url, "https://fs3.formsite.com/api/v2/acme/forms");
  assertEquals(calls[0].headers["authorization"], "bearer tok");
});

Deno.test("auth: test classifies from the vendor error body", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { error: { message: "Invalid access token.", status: 401 } } },
  ]);
  // deno-lint-ignore no-explicit-any
  const res = await (auth.test as any)({ credential }, ctx);
  assertEquals(res, { ok: false, message: "Invalid access token. (401)" });
});

Deno.test("auth: test falls back to the HTTP status without an error body", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  // deno-lint-ignore no-explicit-any
  const res = await (auth.test as any)({ credential }, ctx);
  assertEquals(res, { ok: false, message: "Formsite returned 500 (500)" });
});

Deno.test("auth: test rejects an incomplete credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  // deno-lint-ignore no-explicit-any
  const res = await (auth.test as any)({ credential: { server: "fs3" } }, ctx);
  assertEquals(res.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("auth: afterConnect records server and userDir only", async () => {
  // deno-lint-ignore no-explicit-any
  const out = await (auth.afterConnect as any)({ credential }, mockCtx().ctx);
  assertEquals(out, { server: "fs3", userDir: "acme" });
});
