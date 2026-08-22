import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  addressRef,
  compact,
  csv,
  describeError,
  EasyPostClient,
  json,
  query,
  sortRates,
} from "../../lib/client.ts";

Deno.test("compact: drops unset keys so an omitted field stays omitted", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: [], f: false }), {
    a: 1,
    f: false,
  });
});

Deno.test("query: keeps numbers and booleans, drops blanks", () => {
  assertEquals(query({ a: 1, b: false, c: "x", d: "", e: undefined }), { a: 1, b: false, c: "x" });
});

Deno.test("csv: splits, trims and drops empties; blank means unset", () => {
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
});

Deno.test("json: parses text, passes live values, and names the bad field", () => {
  assertEquals(json('{"a":1}', "parcel"), { a: 1 });
  try {
    json("{oops", "parcel");
    throw new Error("expected a throw");
  } catch (err) {
    assert(String(err).includes("`parcel`"), String(err));
  }
});

/** EasyPost accepts an address inline or by id, and a warehouse should reuse one. */
Deno.test("addressRef: a plain string becomes an id reference", () => {
  assertEquals(addressRef("adr_123", "fromAddress"), { id: "adr_123" });
  assertEquals(addressRef('{"street1":"1 Main St"}', "toAddress"), { street1: "1 Main St" });
  assertEquals(addressRef({ street1: "1 Main St" }, "toAddress"), { street1: "1 Main St" });
  assertEquals(addressRef("", "toAddress"), undefined);
});

/**
 * `rate` is a string. Comparing rates as strings puts "9.99" above "10.05",
 * which buys the wrong label and is never noticed.
 */
Deno.test("sortRates: orders numerically, not lexically", () => {
  const sorted = sortRates([
    { id: "r1", rate: "10.05" },
    { id: "r2", rate: "9.99" },
    { id: "r3", rate: "100.00" },
  ]);
  assertEquals(sorted.map((r) => r.id), ["r2", "r1", "r3"]);
});

Deno.test("sortRates: does not mutate its input", () => {
  const rates = [{ id: "r1", rate: "10" }, { id: "r2", rate: "5" }];
  sortRates(rates);
  assertEquals(rates.map((r) => r.id), ["r1", "r2"]);
});

Deno.test("client: builds the v2 URL and sets no authorization", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { shipments: [] } }]);
  await new EasyPostClient(ctx).request("/shipments");
  assertEquals(calls[0].url, "https://api.easypost.com/v2/shipments");
  assertEquals(calls[0].headers["authorization"], undefined);
});

/** Sending the bare object fails with an error that never mentions the wrapper. */
Deno.test("client: a body is wrapped in its type key", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "shp_1" } }]);
  await new EasyPostClient(ctx).request("/shipments", {
    method: "POST",
    wrapIn: "shipment",
    body: { reference: "order-1" },
  });
  assertEquals(JSON.parse(calls[0].body!), { shipment: { reference: "order-1" } });
});

Deno.test("client: an unwrapped body is sent as-is", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new EasyPostClient(ctx).request("/shipments/shp_1/buy", {
    method: "POST",
    body: { rate: { id: "rate_1" } },
  });
  assertEquals(JSON.parse(calls[0].body!), { rate: { id: "rate_1" } });
});

Deno.test("client: an array query value uses EasyPost's bracket form", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new EasyPostClient(ctx).request("/shipments", { query: { ids: ["a", "b"] } });
  assertEquals(new URL(calls[0].url).searchParams.getAll("ids[]"), ["a", "b"]);
});

/** The nested `errors` array names the field, which is usually the real problem. */
Deno.test("describeError: surfaces the field-level errors and suggestions", () => {
  const out = describeError(
    422,
    JSON.stringify({
      error: {
        code: "ADDRESS.VERIFY.FAILURE",
        message: "Unable to verify address.",
        errors: [{ field: "zip", message: "invalid", suggestion: "90277" }],
      },
    }),
  );
  assert(out.includes("Unable to verify address."), out);
  assert(out.includes("zip: invalid"), out);
  assert(out.includes("suggested: 90277"), out);
});

Deno.test("describeError: an array message is joined rather than rendered as an object", () => {
  const out = describeError(422, JSON.stringify({ error: { message: ["a", "b"] } }));
  assert(out.includes("a; b"), out);
});

/** A burst limit is fixed by spacing calls, not by waiting for a quota. */
Deno.test("describeError: a 429 says it is a burst limit", () => {
  const out = describeError(429, "{}");
  assert(/5 requests per second/.test(out), out);
  assert(/burst limit rather than a quota/.test(out), out);
});

Deno.test("describeError: a 401 mentions deactivated keys", () => {
  assert(/deactivated/.test(describeError(401, "{}")));
});

Deno.test("client: an error carries the method, the path and EasyPost's message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error: { code: "NOT_FOUND", message: "The requested resource could not be found." } },
  }]);
  await assertRejects(
    async () => await new EasyPostClient(ctx).request("/shipments/nope"),
    Error,
    "EasyPost 404 for GET /v2/shipments/nope: The requested resource could not be found.",
  );
});
