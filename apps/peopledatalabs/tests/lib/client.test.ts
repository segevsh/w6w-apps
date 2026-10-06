import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { buildQuery, errorText, errorTypes, jsonValue, PdlClient } from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("buildQuery: skips unset, empty and false values, keeps true and 0", () => {
  assertEquals(
    buildQuery({ a: "x", b: undefined, c: "", d: false, e: true, f: 0 }),
    "?a=x&e=true&f=0",
  );
  assertEquals(buildQuery({}), "");
});

Deno.test("errorText/errorTypes: handle the live array `type` and the documented string `type`", () => {
  const arr = { status: 401, error: { type: ["authentication_error"], message: "bad key" } };
  const str = { status: 402, error: { type: "payment_required", message: "no credits" } };
  assertEquals(errorText(arr), "authentication_error: bad key");
  assertEquals(errorText(str), "payment_required: no credits");
  assertEquals(errorTypes(arr), ["authentication_error"]);
  assertEquals(errorTypes(str), ["payment_required"]);
  assertEquals(errorTypes(null), []);
  assertEquals(errorText(null, "  raw text "), "raw text");
});

Deno.test("jsonValue: parses text, passes objects, throws on bad JSON", () => {
  assertEquals(jsonValue('{"a":1}', "q"), { a: 1 });
  assertEquals(jsonValue({ a: 1 }, "q"), { a: 1 });
  assertEquals(jsonValue("  ", "q"), undefined);
  assertThrows(() => jsonValue("{nope", "q"), Error, "q must be valid JSON");
});

Deno.test("client: sends JSON accept, never credentials; non-JSON errors report the raw text", async () => {
  const { ctx, calls } = mockCtx([{ status: 502, body: "Bad gateway" }]);
  await assertRejects(
    () => new PdlClient(ctx).request("POST", "/v5/x", { body: { a: 1 } }),
    Error,
    "HTTP 502 — Bad gateway",
  );
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
});
