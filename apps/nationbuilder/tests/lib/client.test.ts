import { test } from "node:test";
import { assertEquals, assertRejects, assertThrows } from "../_assert.ts";
import { mockCtx, mockNationBuilderCtx } from "../_helpers.ts";
import {
  baseUrl,
  compact,
  csv,
  dataEnvelope,
  errorMessage,
  flatten,
  flattenMany,
  NationBuilderClient,
  parseJsonObject,
  slugFromConnection,
} from "../../lib/client.ts";

test("client: builds the URL from the connection's slug, not a param", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{ body: { data: { id: "1" } } }], "acme");
  await new NationBuilderClient(ctx).request("/signups/1");
  assertEquals(calls[0].url, "https://acme.nationbuilder.com/api/v2/signups/1");
  assertEquals("authorization" in calls[0].headers, false);
});

test("client: fails loudly when the connection carries no slug", () => {
  const { ctx } = mockCtx();
  assertThrows(() => new NationBuilderClient(ctx), Error, "no nation slug");
});

test("client: applies filter[] and query params", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{ body: { data: [] } }]);
  await new NationBuilderClient(ctx).request("/signups", {
    query: { "page[size]": 10 },
    filter: { email: "a@b.com" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("page[size]"), "10");
  assertEquals(url.searchParams.get("filter[email]"), "a@b.com");
});

test("client: an operator-suffixed filter key is passed through verbatim", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{ body: { data: [] } }]);
  await new NationBuilderClient(ctx).request("/signups", {
    filter: { "donations_amount_in_cents][gt": 500 },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("filter[donations_amount_in_cents][gt]"), "500");
});

test("client: surfaces NationBuilder's 422 validation error shape", async () => {
  const { ctx } = mockNationBuilderCtx([{
    status: 422,
    statusText: "Unprocessable Entity",
    body: {
      errors: [{
        code: "unprocessable_entity",
        status: "422",
        title: "Validation Error",
        detail: "Address is required",
      }],
    },
  }]);
  await assertRejects(
    () => new NationBuilderClient(ctx).request("/signups", { method: "POST", body: {} }),
    Error,
    "Address is required",
  );
});

test("client: surfaces NationBuilder's flat {code, message} error shape", async () => {
  const { ctx } = mockNationBuilderCtx([{
    status: 404,
    statusText: "Not Found",
    body: { code: "not_found", message: "Record not found" },
  }]);
  await assertRejects(
    () => new NationBuilderClient(ctx).request("/signups/999"),
    Error,
    "not_found: Record not found",
  );
});

test("client: returns undefined for a 204", async () => {
  const { ctx } = mockNationBuilderCtx([{ status: 204 }]);
  assertEquals(
    await new NationBuilderClient(ctx).request("/signups/1", { method: "DELETE" }),
    undefined,
  );
});

test("slugFromConnection: reads the display data afterConnect records", () => {
  assertEquals(slugFromConnection({ display: { slug: "acme" } } as never), "acme");
  assertThrows(() => slugFromConnection(undefined), Error, "no nation slug");
});

test("baseUrl: builds the per-nation host", () => {
  assertEquals(baseUrl("acme"), "https://acme.nationbuilder.com/api/v2");
});

test("flatten: merges id/type with attributes", () => {
  assertEquals(
    flatten({ id: "1", type: "signups", attributes: { first_name: "Kim" } }),
    { id: "1", type: "signups", first_name: "Kim" },
  );
  assertEquals(flatten(undefined), undefined);
});

test("flattenMany: flattens a list, dropping nothing", () => {
  assertEquals(
    flattenMany([{ id: "1", type: "signups", attributes: {} }, { id: "2", type: "signups" }]),
    [{ id: "1", type: "signups" }, { id: "2", type: "signups" }],
  );
  assertEquals(flattenMany(undefined), []);
});

test("compact: drops undefined and empty-string values only", () => {
  assertEquals(compact({ a: 1, b: undefined, c: "", d: 0, e: false, f: null }), {
    a: 1,
    d: 0,
    e: false,
    f: null,
  });
});

test("dataEnvelope: builds the JSON:API create/update shape", () => {
  assertEquals(dataEnvelope("signups", { first_name: "Kim", email: "" }), {
    data: { type: "signups", attributes: { first_name: "Kim" } },
  });
  assertEquals(dataEnvelope("signups", { first_name: "Kim" }, "5"), {
    data: { type: "signups", id: "5", attributes: { first_name: "Kim" } },
  });
});

test("parseJsonObject: accepts a JSON string or an already-parsed object", () => {
  assertEquals(parseJsonObject('{"a":1}'), { a: 1 });
  assertEquals(parseJsonObject({ a: 1 }), { a: 1 });
  assertEquals(parseJsonObject(undefined), undefined);
  assertEquals(parseJsonObject(""), undefined);
  assertThrows(() => parseJsonObject("[1,2]"), Error, "JSON object");
});

test("csv: splits and trims, dropping blanks", () => {
  assertEquals(csv("1, 2 ,3"), ["1", "2", "3"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv(undefined), undefined);
});

test("errorMessage: reads the errors[] validation shape", () => {
  assertEquals(
    errorMessage(JSON.stringify({ errors: [{ detail: "Address is required" }] })),
    "Address is required",
  );
});

test("errorMessage: reads the flat {code, message} shape", () => {
  assertEquals(
    errorMessage(JSON.stringify({ code: "not_found", message: "Record not found" })),
    "not_found: Record not found",
  );
});

test("errorMessage: falls back to raw text for a non-JSON body", () => {
  assertEquals(errorMessage("plain text failure"), "plain text failure");
  assertEquals(errorMessage(""), "");
});
