import { assertEquals, assertRejects } from "@std/assert";
import {
  buildQuery,
  EnchargeClient,
  encodeId,
  errorCode,
  errorText,
  jsonValue,
} from "../../lib/client.ts";
import { peopleQuery, personRef, personRefs } from "../../lib/people.ts";
import { errBody, mockCtx } from "../_helpers.ts";

Deno.test("client: encodeId, jsonValue and buildQuery", () => {
  assertEquals(encodeId("a b/c"), "a%20b%2Fc");
  assertEquals(jsonValue('{"a":1}'), { a: 1 });
  assertEquals(jsonValue("  "), undefined);
  assertEquals(jsonValue("not json"), "not json");
  assertEquals(jsonValue([1]), [1]);
  assertEquals(buildQuery([["a", 1], ["b", ""], ["c", undefined], ["a", "x y"]]), "?a=1&a=x+y");
  assertEquals(buildQuery(undefined), "");
  assertEquals(
    buildQuery([["people[0][email]", "a@x.com"]]),
    "?people%5B0%5D%5Bemail%5D=a%40x.com",
  );
});

Deno.test("client: errorText and errorCode read both envelopes and never the stack", () => {
  assertEquals(errorText({ error: { message: "m", stack: "secret trace" } }), "m");
  assertEquals(errorText({ error: "plain" }), "plain");
  assertEquals(errorText({ nope: 1 }), undefined);
  assertEquals(errorText(null), undefined);
  assertEquals(errorCode(errBody("m", 10082)), 10082);
  assertEquals(errorCode({ error: "x" }), undefined);
});

Deno.test("client: a failure message omits stack and markdown and names the path", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error: { message: "bad", stack: "at secret.ts:1", markdown: "<p>bad</p>" } },
  }]);
  const err = await assertRejects(() => new EnchargeClient(ctx).request("GET", "/x"), Error);
  assertEquals(err.message, "Encharge GET /v1/x failed: HTTP 400 — bad");
});

Deno.test("client: a non-JSON failure quotes the body; success shapes are normalised", async () => {
  const html = mockCtx([{ status: 404, body: "<pre>Cannot GET /v1/tags</pre>", headers: {} }]);
  await assertRejects(
    () => new EnchargeClient(html.ctx).request("GET", "/tags"),
    Error,
    "Cannot GET /v1/tags",
  );
  const empty = mockCtx([{ status: 204 }, { body: [1, 2] }, { body: { a: 1 } }]);
  const c = new EnchargeClient(empty.ctx);
  assertEquals(await c.request("DELETE", "/x"), { ok: true });
  assertEquals(await c.request("GET", "/x"), { result: [1, 2] });
  assertEquals(await c.request("GET", "/x"), { a: 1 });
});

Deno.test("people: personRef trims, personRefs resolves and peopleQuery indexes", () => {
  assertEquals(personRef({ email: " a@x.com ", userId: "" }), { email: "a@x.com" });
  assertEquals(personRefs({ email: "a@x.com" }), [{ email: "a@x.com" }]);
  assertEquals(peopleQuery([{ email: "a" }, { id: "i", userId: "u" }]), [
    ["people[0][email]", "a"],
    ["people[1][id]", "i"],
    ["people[1][userId]", "u"],
  ]);
});
