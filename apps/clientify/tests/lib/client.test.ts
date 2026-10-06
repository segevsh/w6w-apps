import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  asJson,
  asObject,
  ClientifyClient,
  compact,
  errorText,
  formatClientifyError,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: keeps the trailing slash and omits empty query values", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new ClientifyClient(ctx).request("/v1/contacts/", {
    query: { query: "a b", page: 2, empty: "", none: undefined },
  });
  assertEquals(calls[0].url, "https://api.clientify.net/v1/contacts/?query=a+b&page=2");
});

Deno.test("client: 204 resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await new ClientifyClient(ctx).request("/v1/x/", { method: "DELETE" }), undefined);
});

Deno.test("client: errors carry the vendor `detail`", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { detail: "Invalid token." } }]);
  await assertRejects(
    () => new ClientifyClient(ctx).request("/v1/users/"),
    Error,
    "Clientify 401 for GET /v1/users/: Invalid token.",
  );
});

Deno.test("client: DRF field-error bodies are flattened; non-JSON is truncated raw", () => {
  assertEquals(
    formatClientifyError(
      400,
      "POST",
      "/v1/deals/",
      '{"name":["This field is required."],"amount":"bad"}',
    ),
    "Clientify 400 for POST /v1/deals/: name: This field is required.; amount: bad",
  );
  assertEquals(
    formatClientifyError(404, "GET", "/v1/nope/", "<html>x</html>"),
    "Clientify 404 for GET /v1/nope/: <html>x</html>",
  );
});

Deno.test("client: errorText, compact, asJson, asObject", () => {
  assertEquals(errorText({ detail: "x" }), "x");
  assertEquals(errorText([]), undefined);
  assertEquals(compact({ a: 0, b: false, c: "", d: null, e: undefined, f: "x" }), {
    a: 0,
    b: false,
    f: "x",
  });
  assertEquals(asJson('["a"]'), ["a"]);
  assertEquals(asJson(" "), undefined);
  assertEquals(asJson([1]), [1]);
  assertThrows(() => asJson("{nope"), Error, "valid JSON");
  assertEquals(asObject(undefined, "x"), {});
  assertEquals(asObject('{"a":1}', "x"), { a: 1 });
  assertThrows(() => asObject("[1]", "filters"), Error, "filters must be a JSON object");
});
