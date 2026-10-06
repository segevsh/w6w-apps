import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { bulkRecords, compact, enrichFlags, ProspeoClient } from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: a 400 error_code body throws with the code, never the status alone", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: true, error_code: "INVALID_API_KEY" } }]);
  await assertRejects(
    () => new ProspeoClient(ctx).call("/enrich-person", { body: {} }),
    Error,
    "INVALID_API_KEY",
  );
});

Deno.test("client: filter_error rides along and a 429 names the reset", async () => {
  const a = mockCtx([{
    status: 400,
    body: { error: true, error_code: "INVALID_FILTERS", filter_error: "bad industry" },
  }]);
  await assertRejects(() => new ProspeoClient(a.ctx).call("/search-person"), Error, "bad industry");
  const b = mockCtx([{
    status: 429,
    headers: { "x-minute-reset-seconds": "12" },
    body: "slow down",
  }]);
  await assertRejects(
    () => new ProspeoClient(b.ctx).call("/search-person"),
    Error,
    "resets in 12s",
  );
});

Deno.test("client: soft codes return the body; HTTP 200 with error:true still throws otherwise", async () => {
  const a = mockCtx([{ status: 400, body: { error: true, error_code: "NO_MATCH" } }]);
  const r = await new ProspeoClient(a.ctx).call("/x", { soft: ["NO_MATCH"] });
  assertEquals(r, { error: true, error_code: "NO_MATCH" });
  const b = mockCtx([{ status: 200, body: { error: true, error_code: "INTERNAL_ERROR" } }]);
  await assertRejects(() => new ProspeoClient(b.ctx).call("/x", { soft: ["NO_MATCH"] }));
});

Deno.test("client: POST sends JSON, GET sends none, and no credential header is set", async () => {
  const { ctx, calls } = mockCtx([{ body: { error: false } }, { body: { error: false } }]);
  const c = new ProspeoClient(ctx);
  await c.call("/a", { body: { k: 1 } });
  await c.call("/b", { method: "GET" });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[1].method, "GET");
  assertEquals(calls[1].body, null);
  assertEquals(calls[0].headers["x-key"], undefined);
});

Deno.test("client: helpers compact, flags and bulk validation", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: false }), { a: 1, d: false });
  assertEquals(enrichFlags({ enrichMobile: true }), { enrich_mobile: true });
  assertEquals(bulkRecords('[{"identifier":"1","email":"a@b.co"}]').length, 1);
  assertThrows(() => bulkRecords([]), Error, "non-empty");
  assertThrows(() => bulkRecords([{ email: "a" }]), Error, "identifier");
  assertThrows(
    () => bulkRecords(Array.from({ length: 51 }, (_, i) => ({ identifier: String(i) }))),
    Error,
    "limit is 50",
  );
  assertThrows(() => bulkRecords("{nope"), Error, "valid JSON");
});
