import { assertEquals, assertRejects } from "@std/assert";
import {
  asOptionalJson,
  compact,
  encodeSegments,
  formatError,
  SavvyCalClient,
  stripWebhookSecret,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("compact drops undefined, null and empty string but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0 }), { d: false, e: 0 });
});

Deno.test("encodeSegments", () => {
  assertEquals(encodeSegments("/America/New_York/"), "America/New_York");
});

Deno.test("asOptionalJson", () => {
  assertEquals(asOptionalJson("[1]", "x"), [1]);
  assertEquals(asOptionalJson(undefined, "x"), undefined);
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
});

Deno.test("formatError handles plain text, JSON and empty bodies", () => {
  assertEquals(
    formatError(401, "GET", "/v1/me", "Unauthenticated"),
    "SavvyCal 401 for GET /v1/me: Unauthenticated",
  );
  assertEquals(
    formatError(422, "POST", "/v1/links", '{"errors":{"name":["blank"]}}'),
    'SavvyCal 422 for POST /v1/links: {"name":["blank"]}',
  );
  assertEquals(formatError(500, "GET", "/v1/x", ""), "SavvyCal 500 for GET /v1/x: (empty body)");
});

Deno.test("client: an empty 2xx body yields undefined; a non-JSON 2xx body throws", async () => {
  const a = mockCtx([{ status: 204 }]);
  assertEquals(await new SavvyCalClient(a.ctx).json("/x"), undefined);
  const b = mockCtx([{ body: "<html/>", headers: { "content-type": "text/html" } }]);
  await assertRejects(() => new SavvyCalClient(b.ctx).json("/x"), Error, "non-JSON");
});

Deno.test("stripWebhookSecret leaves non-objects alone", () => {
  assertEquals(stripWebhookSecret(null), null);
  assertEquals(stripWebhookSecret([1]), [1]);
});
