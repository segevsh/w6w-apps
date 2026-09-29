import { assertEquals, assertRejects } from "@std/assert";
import {
  asOptionalJson,
  compact,
  formatSharetribeError,
  SharetribeClient,
  toCommaList,
} from "../../lib/client.ts";
import { API_ROOT, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("compact: drops undefined/null/empty-string but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("toCommaList: normalises an array or a string into a comma-joined string", () => {
  assertEquals(toCommaList(["a", " b ", ""]), "a,b");
  assertEquals(toCommaList("a, b"), "a,b");
  assertEquals(toCommaList(undefined), undefined);
  assertEquals(toCommaList(""), undefined);
});

Deno.test("asOptionalJson: parses a JSON string, passes through an object, rejects invalid JSON", () => {
  assertEquals(asOptionalJson('{"a":1}', "x"), { a: 1 });
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(asOptionalJson(undefined, "x"), undefined);
  assertEquals(asOptionalJson("", "x"), undefined);
  let threw = false;
  try {
    asOptionalJson("{not json", "myField");
  } catch (e) {
    threw = true;
    assertEquals((e as Error).message, "myField is not valid JSON");
  }
  assertEquals(threw, true);
});

Deno.test("formatSharetribeError: joins every entry's code/title/details, with the field path", () => {
  const raw = JSON.stringify({
    errors: [
      {
        id: "1",
        status: 400,
        code: "validation-missing-key",
        title: "Missing required key.",
        source: { path: ["title"], type: "body" },
      },
      {
        id: "2",
        status: 400,
        code: "validation-invalid-value",
        title: "Invalid value",
        details: "lat must be a number",
      },
    ],
  });
  const msg = formatSharetribeError(400, "POST", "/v1/integration_api/listings/create", raw);
  assertEquals(msg.includes("validation-missing-key"), true);
  assertEquals(msg.includes("(body: title)"), true);
  assertEquals(msg.includes("validation-invalid-value"), true);
  assertEquals(msg.includes("lat must be a number"), true);
});

Deno.test("formatSharetribeError: falls back to the raw body when it is not the errors[] shape (5xx)", () => {
  const msg = formatSharetribeError(
    500,
    "GET",
    "/v1/integration_api/marketplace/show",
    "Internal Server Error",
  );
  assertEquals(msg.includes("Internal Server Error"), true);
});

Deno.test("SharetribeClient.show: GET, no expand, unwraps {data}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: { id: "l1", type: "listing", attributes: {} } },
  }]);
  const resource = await new SharetribeClient(ctx).show("/listings/show", { id: "l1" });
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), `${new URL(API_ROOT).pathname}/listings/show`);
  assertEquals(queryOf(calls[0].url), { id: "l1" });
  assertEquals(resource, { id: "l1", type: "listing", attributes: {} });
});

Deno.test("SharetribeClient.query: GET, returns the full envelope with meta", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { data: [{ id: "l1" }], meta: { totalItems: 1 } },
  }]);
  const page = await new SharetribeClient(ctx).query("/listings/query", {});
  assertEquals(page, { data: [{ id: "l1" }], meta: { totalItems: 1 } });
});

Deno.test("SharetribeClient.command: POST, always sends expand=true, unwraps {data}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: { id: "l1", type: "listing", attributes: { title: "x" } } },
  }]);
  const resource = await new SharetribeClient(ctx).command("/listings/close", { id: "l1" });
  assertEquals(calls[0].method, "POST");
  assertEquals(queryOf(calls[0].url), { expand: "true" });
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { id: "l1" });
  assertEquals(resource, { id: "l1", type: "listing", attributes: { title: "x" } });
});

Deno.test("SharetribeClient: a non-ok response throws with the formatted error", async () => {
  const { ctx } = mockCtx([
    {
      status: 409,
      body: {
        errors: [{ id: "e", status: 409, code: "listing-invalid-state", title: "Invalid state" }],
      },
    },
  ]);
  await assertRejects(
    () => new SharetribeClient(ctx).command("/listings/approve", { id: "l1" }),
    Error,
    "listing-invalid-state",
  );
});
