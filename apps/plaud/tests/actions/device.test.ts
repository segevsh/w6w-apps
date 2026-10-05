import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import bind from "../../actions/device-bind.ts";
import unbind from "../../actions/device-unbind.ts";
import get from "../../actions/device-binding-get.ts";

const D = { display: { region: "us" } };
const BASE = "https://platform-us.plaud.ai/developer/api/open/partner/sdk";

Deno.test("device-bind: POSTs {type, sn}, deriving the type from the serial prefix", async () => {
  const { ctx, calls } = mockCtx([{
    body: { type: "notepro", sn: "8810000000000001", is_bind: true },
  }], D);
  const out = await bind.execute({ sn: "8810000000000001" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${BASE}/bind`);
  assertEquals(JSON.parse(calls[0].body!), { type: "notepro", sn: "8810000000000001" });
  assertEquals(out, { type: "notepro", sn: "8810000000000001", isBound: true });
});

Deno.test("device-bind: 403 explains the other-account owner; 404 explains the bare body", async () => {
  const forbidden = mockCtx([{
    status: 403,
    body: { code: 403, message: "device already bound to another account" },
  }], D);
  const e1 = await assertRejects(() =>
    Promise.resolve(bind.execute({ sn: "8810000000000001" }, forbidden.ctx))
  );
  assertEquals(/another account/.test((e1 as Error).message), true);
  const unknown = mockCtx([{ status: 404, body: "" }], D);
  const e2 = await assertRejects(() =>
    Promise.resolve(bind.execute({ sn: "8810000000000001" }, unknown.ctx))
  );
  assertEquals(/bare 404/.test((e2 as Error).message), true);
});

Deno.test("device-bind: needs a serial, and a type it can derive or be given", async () => {
  const { ctx } = mockCtx([], D);
  await assertRejects(() => Promise.resolve(bind.execute({}, ctx)), Error, "sn");
  await assertRejects(() => Promise.resolve(bind.execute({ sn: "123" }, ctx)), Error, "type");
});

Deno.test("device-unbind: POSTs to /unbind with an explicit type", async () => {
  const { ctx, calls } = mockCtx([{
    body: { type: "notepins", sn: "8820000000000009", is_bind: false },
  }], D);
  const out = await unbind.execute({ sn: "8820000000000009", type: "notepins" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].url, `${BASE}/unbind`);
  assertEquals(JSON.parse(calls[0].body!), { type: "notepins", sn: "8820000000000009" });
  assertEquals(out.isBound, false);
});

Deno.test("device-binding-get: GETs with type+sn query and de-duplicates the history", async () => {
  const { ctx, calls } = mockCtx([{ body: { is_bind: false, bind_history: ["a", "b", "a"] } }], D);
  const out = await get.execute({ sn: "8810000000000001" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${BASE}/binding?type=notepro&sn=8810000000000001`);
  assertEquals(out, { isBound: false, bindHistory: ["a", "b"], bindEvents: 3 });
});

Deno.test("device-binding-get: null is_bind (never bound) is preserved, not coerced to false", async () => {
  const { ctx } = mockCtx([{ body: { is_bind: null } }], D);
  const out = await get.execute({ sn: "8810000000000001" }, ctx) as Record<string, unknown>;
  assertEquals(out, { isBound: null, bindHistory: [], bindEvents: 0 });
});

Deno.test("device-*: the Japan connection calls the Japan host", async () => {
  const { ctx, calls } = mockCtx([{ body: { is_bind: true } }], { display: { region: "jp" } });
  await bind.execute({ sn: "8810000000000001" }, ctx);
  assertEquals(calls[0].url.startsWith("https://platform-jp.plaud.ai/developer/api/"), true);
});
