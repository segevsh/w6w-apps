import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { asObject, CertifierClient, encodeId, formatError, toList } from "../../lib/client.ts";
import { credentialBody, dateOrThrow } from "../../lib/body.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client: builds /v1 URLs, drops empty query values, sends no credential", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await new CertifierClient(ctx).json("/credentials", { query: { limit: 5, cursor: "", x: null } });
  assertEquals(pathOf(calls[0].url), "/v1/credentials");
  assertEquals(queryOf(calls[0].url), { limit: "5" });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: a 204 resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await new CertifierClient(ctx).json("/x", { method: "DELETE" }), undefined);
});

Deno.test("client: errors carry status, vendor code and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("not_found", "gone") }]);
  await assertRejects(
    () => new CertifierClient(ctx).json("/credentials/x"),
    Error,
    "HTTP 404 not_found — gone",
  );
});

Deno.test("client: a 429 reports Retry-After", () => {
  const msg = formatError(429, "GET", "/v1/x", '{"error":{"code":"rate_limited"}}', "3");
  assertEquals(msg.includes("retry after 3s"), true);
});

Deno.test("client: helpers", () => {
  assertEquals(encodeId(" a/b "), "a%2Fb");
  assertThrows(() => encodeId(" "), Error, "id is required");
  assertEquals(toList("a, b,,c"), ["a", "b", "c"]);
  assertEquals(toList(undefined), []);
  assertEquals(asObject('{"a":1}', "f"), { a: 1 });
  assertThrows(() => asObject("[1]", "f"), Error, "must be a JSON object");
  assertThrows(() => asObject("{", "f"), Error, "not valid JSON");
});

Deno.test("body: dates must be YYYY-MM-DD; recipient email is optional", () => {
  assertEquals(dateOrThrow("2026-10-06", "d"), "2026-10-06");
  assertThrows(() => dateOrThrow("10/06/2026", "d"), Error, "YYYY-MM-DD");
  assertEquals(credentialBody({ groupId: "g", recipientName: "A" }), {
    groupId: "g",
    recipient: { name: "A" },
  });
  assertThrows(() => credentialBody({ groupId: "", recipientName: "A" }), Error, "groupId");
});
