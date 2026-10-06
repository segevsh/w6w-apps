import { assertEquals, assertRejects } from "@std/assert";
import {
  baseUuidFromConnection,
  describeError,
  GATEWAY,
  SeaTableClient,
} from "../../lib/client.ts";
import { BASE_UUID, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("client: describeError reads error_message, error_msg, detail and bare strings", () => {
  assertEquals(describeError(403, '{"error_message":"invalid token"}'), "403: invalid token");
  assertEquals(describeError(403, '{"error_msg":"Permission denied."}'), "403: Permission denied.");
  assertEquals(describeError(401, '{"detail":"Invalid token"}'), "401: Invalid token");
  assertEquals(describeError(400, '"bad"'), "400: bad");
  assertEquals(describeError(502, "<html>Bad gateway</html>"), "502: <html>Bad gateway</html>");
  assertEquals(describeError(500, ""), "HTTP 500");
});

Deno.test("client: a 429 is a rate-limit message whatever the body", () => {
  assertEquals(describeError(429, "").startsWith("rate limited (429)"), true);
});

Deno.test("client: baseUuidFromConnection requires display.baseUuid", () => {
  assertEquals(baseUuidFromConnection(mockCtx().ctx.connection), BASE_UUID);
  try {
    baseUuidFromConnection(undefined);
    throw new Error("expected throw");
  } catch (err) {
    assertEquals(String(err).includes("no base"), true);
  }
});

Deno.test("client: requests go to the gateway under the connection's base, query dropping empties", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: 1 } }]);
  await new SeaTableClient(ctx).request("/rows/", {
    query: { a: "x", b: undefined, c: "", d: null, e: false, f: 0 },
  });
  assertEquals(calls[0].url.startsWith(`${GATEWAY}/dtables/${BASE_UUID}/rows/?`), true);
  assertEquals(queryOf(calls[0].url), { a: "x", e: "false", f: "0" });
});

Deno.test("client: a JSON body sets content-type; a GET does not", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  const client = new SeaTableClient(ctx);
  await client.request("/x/", { method: "POST", body: { a: 1 } });
  await client.request("/y/");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[1].headers["content-type"], undefined);
});

Deno.test("client: an empty success body yields {} and a non-JSON one is kept as raw", async () => {
  const { ctx } = mockCtx([{ body: undefined }, { body: "plain", headers: {} }]);
  const client = new SeaTableClient(ctx);
  assertEquals(await client.request("/a/"), {});
  assertEquals(await client.request("/b/"), { raw: "plain" });
});

Deno.test("client: failures throw with the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error_msg: "dtable not found." } }]);
  await assertRejects(
    () => new SeaTableClient(ctx).request("/a/"),
    Error,
    "404: dtable not found.",
  );
});
