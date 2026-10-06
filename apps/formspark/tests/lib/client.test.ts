import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  compact,
  FormsparkClient,
  FormsparkError,
  problemCode,
  queryString,
} from "../../lib/client.ts";
import { mockCtx, problem } from "../_helpers.ts";

Deno.test("client: queryString drops unset values but keeps false and 0", () => {
  assertEquals(
    queryString({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }),
    "?a=1&e=false&f=0",
  );
  assertEquals(queryString({}), "");
  assertEquals(compact({ a: "", b: 0 }), { b: 0 });
});

Deno.test("client: a 403 upgrade_required keeps code, status and workspaceId", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: problem(403, "upgrade_required", "Upgrade the workspace.", { workspaceId: "w1" }),
  }]);
  const err = await assertRejects(
    () => new FormsparkClient(ctx).get("/forms", { workspaceId: "w1" }),
    FormsparkError,
  );
  assertEquals(err.status, 403);
  assertEquals(err.code, "upgrade_required");
  assertEquals(err.problem?.workspaceId, "w1");
  assert(err.message.startsWith("Formspark 403 upgrade_required: Upgrade the workspace."));
  assert(err.message.includes("workspace: w1"));
});

Deno.test("client: insufficient_scope names the required scope; validation errors[] are joined", async () => {
  const a = mockCtx([{
    status: 403,
    body: problem(403, "insufficient_scope", "Needs forms:write.", {
      requiredScope: "forms:write",
    }),
  }]);
  const e1 = await assertRejects(() => new FormsparkClient(a.ctx).get("/x"), FormsparkError);
  assert(e1.message.includes("required scope: forms:write"));
  const b = mockCtx([{
    status: 400,
    body: problem(400, "validation_error", "Invalid.", { errors: ["name: too long", "x: bad"] }),
  }]);
  const e2 = await assertRejects(() => new FormsparkClient(b.ctx).get("/x"), FormsparkError);
  assert(e2.message.includes("name: too long; x: bad"));
});

Deno.test("client: a non-JSON error body falls back to the text; non-JSON success throws", async () => {
  const a = mockCtx([{
    status: 502,
    body: "bad gateway",
    headers: { "content-type": "text/plain" },
  }]);
  const e = await assertRejects(() => new FormsparkClient(a.ctx).get("/x"), FormsparkError);
  assertEquals(e.code, undefined);
  assertEquals(e.message, "Formspark 502: bad gateway");
  const b = mockCtx([{ status: 200, body: "<html>", headers: { "content-type": "text/html" } }]);
  await assertRejects(() => new FormsparkClient(b.ctx).get("/x"), Error, "not JSON");
});

Deno.test("client: problemCode only trusts a string code", () => {
  assertEquals(problemCode({ code: "invalid_token" }), "invalid_token");
  assertEquals(problemCode({ code: 5 }), undefined);
  assertEquals(problemCode(null), undefined);
  assertEquals(problemCode([]), undefined);
});

Deno.test("client: requests go to the v1 base with a JSON accept header and no auth", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new FormsparkClient(ctx).get("/me");
  assertEquals(calls[0].url, "https://api.formspark.io/public/v1/me");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});
