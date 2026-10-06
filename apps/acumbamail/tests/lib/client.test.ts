import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { AcumbamailError, call, encodeForm, fnUrl, parseBody, required } from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("encodeForm: drops unset, 1/0 booleans, bracket-encodes dicts and arrays", () => {
  const f = encodeForm({
    a: undefined,
    b: null,
    c: "",
    d: false,
    e: true,
    f: 0,
    g: { email: "x@y.z", n: { k: 1 } },
    h: [5, "s6"],
  });
  assertEquals(Object.fromEntries(f), {
    d: "0",
    e: "1",
    f: "0",
    "g[email]": "x@y.z",
    "g[n][k]": "1",
    "h[0]": "5",
    "h[1]": "s6",
  });
});

Deno.test("fnUrl: only letters; rejects path tricks", () => {
  assertEquals(fnUrl("getLists"), "https://acumbamail.com/api/1/getLists/");
  assertThrows(() => fnUrl("../x"));
});

Deno.test("required / parseBody", () => {
  assertEquals(required("x", " 7 "), "7");
  assertThrows(() => required("x", undefined), Error, "x is required");
  assertEquals(parseBody(""), null);
  assertEquals(parseBody("12"), 12);
  assertEquals(parseBody("not json"), "not json");
});

Deno.test("call: 401 Unauthorized becomes an AcumbamailError carrying status", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Unauthorized" }]);
  const err = await assertRejects(() => call(ctx, "getLists"));
  assert(err instanceof AcumbamailError);
  assertEquals(err.status, 401);
  assertEquals(err.vendorMessage, "Unauthorized");
});
