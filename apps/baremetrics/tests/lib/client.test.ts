import { assert, assertEquals, assertRejects } from "@std/assert";
import { buildQuery, encodeId, errorText, jsonValue } from "../../lib/client.ts";
import { BaremetricsClient } from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("buildQuery: skips unset, null and empty values, joins arrays", () => {
  assertEquals(buildQuery(undefined), "");
  assertEquals(buildQuery({ a: undefined, b: null, c: "", d: 0, e: ["x", "y"] }), "?d=0&e=x%2Cy");
});

Deno.test("encodeId: percent-encodes a path segment", () => {
  assertEquals(encodeId("a/b c"), "a%2Fb%20c");
});

Deno.test("jsonValue: parses JSON text, passes arrays, drops empty strings", () => {
  assertEquals(jsonValue('[{"a":1}]'), [{ a: 1 }]);
  assertEquals(jsonValue([1]), [1]);
  assertEquals(jsonValue("  "), undefined);
  assertEquals(jsonValue("not json"), "not json");
});

Deno.test("errorText: reads error, errors or message", () => {
  assertEquals(errorText({ error: "nope" }), "nope");
  assertEquals(errorText({ errors: ["a"] }), '["a"]');
  assertEquals(errorText({ message: "m" }), "m");
  assertEquals(errorText(null), undefined);
});

Deno.test("client: an empty success body (e.g. a delete) yields an object", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }]);
  assertEquals(await new BaremetricsClient(ctx).request("DELETE", "/src/customers/c1"), {});
  assertEquals(calls[0].url, "https://api.baremetrics.com/v1/src/customers/c1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
});

Deno.test("client: sends no authorization header (sign owns the credential)", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new BaremetricsClient(ctx).request("POST", "/x", { body: { a: 1 } });
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("client: a non-JSON error body is quoted in the message", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>bad gateway</html>", headers: {} }]);
  const err = await assertRejects(() => new BaremetricsClient(ctx).request("GET", "/x"));
  assert((err as Error).message.includes("502") && (err as Error).message.includes("bad gateway"));
});
