import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { compact, flag, formEncode, toObject, VboutClient } from "../../lib/client.ts";
import { errorEnvelope, mockCtx, okEnvelope } from "../_helpers.ts";

Deno.test("formEncode: flattens custom fields to fields[id] and drops empties", () => {
  const out = new URLSearchParams(formEncode({
    email: "a@b.co",
    ipaddress: "",
    status: undefined,
    fields: { "125": "John", "9": 1, "7": null },
  }));
  assertEquals(Object.fromEntries(out), {
    email: "a@b.co",
    "fields[125]": "John",
    "fields[9]": "1",
  });
});

Deno.test("flag, compact and toObject", () => {
  assertEquals([flag(true), flag(false), flag("1"), flag(undefined)], [1, 0, 1, undefined]);
  assertEquals(compact({ a: 1, b: "", c: null, d: undefined }), { a: 1 });
  assertEquals(toObject('{"1":"x"}', "f"), { "1": "x" });
  assertEquals(toObject(undefined, "f"), undefined);
  assertThrows(() => toObject("{nope", "f"), Error, "not valid JSON");
  assertThrows(() => toObject([1], "f"), Error, "must be a JSON object");
});

Deno.test("client: GET puts params in the query, adds .json, never sets the key", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope({ a: 1 }) }]);
  const out = await new VboutClient(ctx).get("emailmarketing/getlist", { id: "5" });
  assertEquals(calls[0].url, "https://api.vbout.com/1/emailmarketing/getlist.json?id=5");
  assertEquals(out, { a: 1 });
});

Deno.test("client: a non-object data is wrapped, a non-JSON body and a bare body are refused", async () => {
  const wrap = mockCtx([{ body: okEnvelope("done") }]);
  assertEquals(await new VboutClient(wrap.ctx).get("x"), { ok: true, data: "done" });
  const html = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  await assertRejects(() => new VboutClient(html.ctx).get("x"), Error, "not JSON");
  const bare = mockCtx([{ body: { lists: [] } }]);
  await assertRejects(() => new VboutClient(bare.ctx).get("x"), Error, "envelope");
});

Deno.test("client: the error envelope is the verdict, even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope(1000, "Boom") }]);
  const err = await assertRejects(() => new VboutClient(ctx).get("x"));
  assert((err as Error).message.includes("Boom"));
  assert((err as Error).message.includes("1000"));
});
