import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  API_BASE,
  asOptionalJson,
  compact,
  csv,
  Ds24Client,
  Ds24Error,
  flatten,
  parseEnvelope,
} from "../../lib/client.ts";
import { envelope, errorEnvelope, fieldsOf, mockCtx } from "../_helpers.ts";

Deno.test("client: base is the documented api/call prefix on www.digistore24.com", () => {
  assertEquals(API_BASE, "https://www.digistore24.com/api/call");
});

Deno.test("flatten: nested objects and arrays use PHP bracket notation", () => {
  assertEquals(
    flatten({
      search: { email: "a@b.c", has_affiliate: true },
      tracking: [{ tracking_id: "1" }, { tracking_id: "2" }],
      amount: 0,
      note: "",
      gone: undefined,
      nope: null,
      flag: false,
    }),
    [
      ["search[email]", "a@b.c"],
      ["search[has_affiliate]", "Y"],
      ["tracking[0][tracking_id]", "1"],
      ["tracking[1][tracking_id]", "2"],
      ["amount", "0"],
      ["flag", "N"],
    ],
  );
});

Deno.test("compact: drops unset values but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("csv and asOptionalJson normalise user input", () => {
  assertEquals(csv(["a", " b ", ""]), "a,b");
  assertEquals(csv("1, 2"), "1,2");
  assertEquals(csv(""), undefined);
  assertEquals(asOptionalJson('{"a":1}', "x"), { a: 1 });
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(asOptionalJson("", "x"), undefined);
  try {
    asOptionalJson("{nope", "Tracking");
    assert(false, "should throw");
  } catch (e) {
    assertEquals((e as Error).message, "Tracking is not valid JSON");
  }
});

Deno.test("parseEnvelope: error with HTTP 200 throws Ds24Error carrying the code", () => {
  try {
    parseEnvelope(200, JSON.stringify(errorEnvelope("The API key is invalid.", 2)), "ping");
    assert(false, "should throw");
  } catch (e) {
    assert(e instanceof Ds24Error);
    assertEquals(e.code, 2);
    assert(e.message.includes("The API key is invalid."));
  }
});

Deno.test("parseEnvelope: markup and missing result are errors, never data", () => {
  for (const raw of ["<html>nope</html>", "{}", ""]) {
    try {
      parseEnvelope(200, raw, "ping");
      assert(false, `should throw for ${raw}`);
    } catch (e) {
      assert(e instanceof Ds24Error);
    }
  }
});

Deno.test("call: GET puts arguments in the query, sends no body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ a: 1 }) }]);
  const out = await new Ds24Client(ctx).call("listBuyers", { page_no: 2 });
  assertEquals(out, { a: 1 });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
  assertEquals(fieldsOf(calls[0]), { page_no: "2" });
  assertEquals(calls[0].headers.accept, "application/json");
});

Deno.test("call: write POSTs a form body and leaves the URL bare", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await new Ds24Client(ctx).call("stopRebilling", { purchase_id: "P1" }, { write: true });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_BASE}/stopRebilling`);
  assertEquals(calls[0].body, "purchase_id=P1");
});

Deno.test("call: an array payload is wrapped as items, an empty one as {}", async () => {
  const { ctx } = mockCtx([{ body: envelope([{ id: 1 }]) }, { body: envelope(null) }]);
  const c = new Ds24Client(ctx);
  assertEquals(await c.call("listProducts"), { items: [{ id: 1 }] });
  assertEquals(await c.call("ipnDelete"), {});
});

Deno.test("call: rejects on the error envelope", async () => {
  const { ctx } = mockCtx([{ body: errorEnvelope("No API key given.", 2) }]);
  await assertRejects(() => new Ds24Client(ctx).call("ping"), Ds24Error, "No API key given.");
});
