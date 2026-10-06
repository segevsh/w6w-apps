import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  compact,
  encodeId,
  formatPaystackError,
  pageQuery,
  PaystackClient,
  requireAmount,
  toList,
} from "../../lib/client.ts";
import { errorBody, mockCtx, ok, queryOf } from "../_helpers.ts";

Deno.test("compact: drops unset keys but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("toList: comma strings and arrays normalise; empty is undefined", () => {
  assertEquals(toList("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(toList([" a ", ""]), ["a"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(undefined), undefined);
});

Deno.test("requireAmount / encodeId", () => {
  assertEquals(requireAmount("100"), 100);
  assert(!Number.isNaN(requireAmount(1)));
  for (const bad of [0, -1, 1.2, "x", undefined]) {
    try {
      requireAmount(bad);
      throw new Error("should have thrown");
    } catch (e) {
      assert(String(e).includes("smallest unit"), String(bad));
    }
  }
  assertEquals(encodeId(" a/b "), "a%2Fb");
});

Deno.test("pageQuery: sends perPage under both spellings", () => {
  assertEquals(pageQuery({ perPage: 3, page: 2 }), {
    perPage: 3,
    per_page: 3,
    page: 2,
    from: undefined,
    to: undefined,
  });
});

Deno.test("formatPaystackError: keeps message, type/code and the vendor's nextStep", () => {
  const raw = JSON.stringify({
    status: false,
    message: "Invalid key",
    type: "validation_error",
    code: "invalid_Key",
    meta: { nextStep: "Ensure that you provide the correct authorization key" },
  });
  const msg = formatPaystackError(401, "GET", "/transaction", raw);
  assert(msg.includes("Invalid key"));
  assert(msg.includes("validation_error/invalid_Key"));
  assert(msg.includes("correct authorization key"));
  assert(formatPaystackError(429, "GET", "/x", raw).includes("rate limited"));
  assert(formatPaystackError(500, "GET", "/x", "<html>oops</html>").includes("<html>oops</html>"));
});

Deno.test("client: a 200 envelope with status:false is an error, not data", async () => {
  const { ctx } = mockCtx([{ body: { status: false, message: "Account not enabled" } }]);
  await assertRejects(
    async () => await new PaystackClient(ctx).data("/x"),
    Error,
    "Account not enabled",
  );
});

Deno.test("client: a non-JSON 200 is reported, an empty 200 is an empty envelope", async () => {
  const a = mockCtx([{ body: "<html>shell</html>", headers: { "content-type": "text/html" } }]);
  await assertRejects(async () => await new PaystackClient(a.ctx).call("/x"), Error, "non-JSON");
  const b = mockCtx([{ status: 200 }]);
  assertEquals(await new PaystackClient(b.ctx).call("/x"), {});
});

Deno.test("client: query arrays join, unset values vanish, only the API host is called", async () => {
  const { ctx, calls } = mockCtx([{ body: ok([]) }]);
  await new PaystackClient(ctx).list("/bank", { a: ["x", "y"], b: undefined, c: "" });
  assertEquals(queryOf(calls[0].url), { a: "x,y" });
  assertEquals(new URL(calls[0].url).host, "api.paystack.co");
  assertEquals(errorBody("m").code, "invalid_Key");
});
