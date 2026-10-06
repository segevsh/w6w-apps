import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const bad = { status: 400, error: { type: ["invalid_request_error"], message: "missing params" } };
const hdr = (v: string) => ({ "content-type": "application/json", "x-totallimit-remaining": v });

Deno.test("quota: declares an informational, signed quota check", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.credential, "signed");
});

Deno.test("quota: reads credits from the header of a parameterless GET /v5/person/enrich", async () => {
  const { ctx, calls } = mockCtx([{ status: 400, body: bad, headers: hdr("1342") }]);
  const r = await quota.check!({} as never, ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.quota, [{ id: "credits", remaining: 1342, unit: "credits" }]);
  assertEquals(new URL(calls[0].url).pathname, "/v5/person/enrich");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("quota: zero credits is degraded; a missing header or a 401 is unknown", async () => {
  const zero = await quota.check!(
    {} as never,
    mockCtx([{ status: 400, body: bad, headers: hdr("0") }]).ctx,
  );
  assertEquals(zero.state, "degraded");
  assertEquals(
    (await quota.check!({} as never, mockCtx([{ status: 400, body: bad }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await quota.check!({} as never, mockCtx([{ status: 401, body: {} }]).ctx)).state,
    "unknown",
  );
});
