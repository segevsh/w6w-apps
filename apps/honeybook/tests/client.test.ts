import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  asOptionalJson,
  compact,
  encodeId,
  formatHoneyBookError,
  HoneyBookClient,
  nonEmpty,
  toList,
} from "../lib/client.ts";
import { errorBody, mockCtx, queryOf } from "./_helpers.ts";

Deno.test("client: arrays go on the wire as one comma-separated value", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new HoneyBookClient(ctx).request("GET", "/pipeline", {
    query: { stage_ids: ["a", "b"], page: 2, archived: false, skip: undefined, empty: "" },
  });
  assertEquals(queryOf(calls[0].url), { stage_ids: "a,b", page: "2", archived: "false" });
});

Deno.test("client: JSON bodies carry a content-type; bodiless calls do not", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  const c = new HoneyBookClient(ctx);
  await c.request("POST", "/contacts", { body: { email: "a@b.co" } });
  await c.request("GET", "/pipeline");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[1].headers["content-type"], undefined);
});

Deno.test("client: 204 resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await new HoneyBookClient(ctx).request("DELETE", "/contacts/1"), undefined);
});

Deno.test("client: a validation failure names the rejected fields", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorBody("HBValidationError", "title is missing", {
      error_data: { fields: [{ field: "title", message: "is missing" }] },
    }),
  }]);
  await assertRejects(
    () => new HoneyBookClient(ctx).request("POST", "/projects"),
    Error,
    "fields: title is missing",
  );
});

Deno.test("client: 403 scope and 404 ambiguity are explained", () => {
  const scope = formatHoneyBookError(
    403,
    "GET",
    "/x",
    JSON.stringify(errorBody("HBInsufficientScopeError", "m")),
  );
  assertEquals(scope.includes("re-authorize"), true);
  const nf = formatHoneyBookError(
    404,
    "GET",
    "/x",
    JSON.stringify(errorBody("HBObjectNotFoundError", "m")),
  );
  assertEquals(nf.includes("may not see it"), true);
});

Deno.test("client: a non-JSON error body is reported verbatim, truncated", () => {
  const out = formatHoneyBookError(502, "GET", "/x", "x".repeat(2000));
  assertEquals(out.startsWith("HoneyBook 502 for GET /x: "), true);
  assertEquals(out.includes("truncated"), true);
});

Deno.test("client: helpers", () => {
  assertEquals(compact({ a: 1, b: "", c: null, d: false }), { a: 1, d: false });
  assertEquals(nonEmpty({}), undefined);
  assertEquals(toList("a, b,,c"), ["a", "b", "c"]);
  assertEquals(toList(""), undefined);
  assertEquals(asOptionalJson('{"a":1}', "x"), { a: 1 });
  assertThrows(() => asOptionalJson("{", "x"), Error, "x is not valid JSON");
  assertEquals(encodeId(" a/b "), "a%2Fb");
  assertThrows(() => encodeId("  "), Error, "an id is required");
});
