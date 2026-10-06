import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  buildQuery,
  compact,
  customFields,
  errorText,
  PylonClient,
  regionFrom,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("customFields: maps to value/values and passes arrays through", () => {
  assertEquals(customFields({ a: 1, b: ["x", "y"] }), [
    { slug: "a", value: "1" },
    { slug: "b", values: ["x", "y"] },
  ]);
  assertEquals(customFields('{"a":"z"}'), [{ slug: "a", value: "z" }]);
  assertEquals(customFields([{ slug: "q", value: "1" }]), [{ slug: "q", value: "1" }]);
  assertEquals(customFields(undefined), undefined);
});

Deno.test("buildQuery and compact", () => {
  assertEquals(buildQuery({ a: 1, b: "", c: undefined, d: false }), "?a=1&d=false");
  assertEquals(buildQuery({}), "");
  assertEquals(compact({ a: undefined, b: "", c: 0 }), { b: "", c: 0 });
});

Deno.test("errorText: message, code and existing id", () => {
  assertEquals(errorText({ errors: ["bad"], code: "x" }), "bad (x)");
  assertEquals(
    errorText({ errors: ["dup"], code: "d", exists_id: "9" }),
    "dup (d) [existing id 9]",
  );
  assertEquals(errorText(null, " plain text "), "plain text");
});

Deno.test("regionFrom: defaults to US, reads display.region", () => {
  assertEquals(regionFrom(undefined), "us");
  // deno-lint-ignore no-explicit-any
  assertEquals(regionFrom({ display: { region: "eu" } } as any), "eu");
});

Deno.test("client: EU host, and a 429 carries the retry hint", async () => {
  const { ctx, calls } = mockCtx([{
    status: 429,
    headers: { "content-type": "application/json", "x-retry-after": "7" },
    body: { errors: ["slow down"], code: "rate_limited" },
  }]);
  const eu = { ...ctx, connection: { display: { region: "eu" } } } as unknown as typeof ctx;
  const err = await assertRejects(() => new PylonClient(eu).request("GET", "/issues"));
  assertEquals(calls[0].url, "https://api.eu.usepylon.com/issues");
  assert((err as Error).message.includes("(retry after 7s)"));
  assert((err as Error).message.includes("rate_limited"));
});
