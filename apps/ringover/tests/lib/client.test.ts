import { assertEquals, assertRejects } from "@std/assert";
import {
  buildQuery,
  callsResult,
  contactNumbers,
  digits,
  digitsInt,
  errorText,
  intList,
  regionFrom,
  RingoverClient,
  strList,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("digits: strips everything but digits", () => {
  assertEquals(digits("+33 (6) 12-34"), "3361234");
  assertEquals(digitsInt("+33612345678"), 33612345678);
});

Deno.test("lists: comma text and arrays; intList drops non-numbers", () => {
  assertEquals(strList("a, b,,c"), ["a", "b", "c"]);
  assertEquals(strList([]), undefined);
  assertEquals(intList("1, x, 3"), [1, 3]);
  assertEquals(intList(undefined), undefined);
});

Deno.test("buildQuery: repeats arrays, skips empty", () => {
  assertEquals(
    buildQuery({ a: ["x", "y"], b: "", c: undefined, d: 0, e: false }),
    "?a=x&a=y&d=0&e=false",
  );
  assertEquals(buildQuery({}), "");
});

Deno.test("regionFrom: eu by default, us when recorded", () => {
  assertEquals(regionFrom(undefined), "eu");
  // deno-lint-ignore no-explicit-any
  assertEquals(regionFrom({ display: { region: "us" } } as any), "us");
});

Deno.test("contactNumbers: coerces number fields, passes other shapes through", () => {
  assertEquals(contactNumbers('[{"number":"+1 2","type":"home"}]'), [{ number: 12, type: "home" }]);
  assertEquals(contactNumbers(undefined), undefined);
});

Deno.test("errorText: Ringover's {error} string, else raw", () => {
  assertEquals(errorText({ error: "Invalid user" }), "Invalid user");
  assertEquals(errorText(undefined, "404 page not found"), "404 page not found");
});

Deno.test("callsResult: lastId is the oldest cdr_id and absent on an empty page", () => {
  assertEquals(callsResult({ call_list: [{ cdr_id: 3 }, { cdr_id: 1 }] }).lastId, 1);
  assertEquals("lastId" in callsResult({}), false);
});

Deno.test("request: US region host, JSON body headers, 429 hint", async () => {
  const { ctx, calls } = mockCtx([{ status: 429, body: { error: "Too many requests" } }]);
  // deno-lint-ignore no-explicit-any
  const c = new RingoverClient({ ...ctx, connection: { display: { region: "us" } } } as any);
  await assertRejects(
    () => c.request("POST", "/x", { body: { a: 1 } }),
    Error,
    "2 requests per second",
  );
  assertEquals(calls[0].url, "https://public-api-us.ringover.com/v2/x");
  assertEquals(calls[0].headers["content-type"], "application/json");
});
