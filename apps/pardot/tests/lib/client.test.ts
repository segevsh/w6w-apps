import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockPardotCtx } from "../_helpers.ts";
import {
  errorText,
  hostFromConnection,
  idOf,
  jsonObject,
  PardotClient,
  unset,
} from "../../lib/client.ts";

Deno.test("client: the host comes from the connection display; absent means production", () => {
  assertEquals(hostFromConnection(undefined), "pi.pardot.com");
  const { ctx } = mockPardotCtx([], "pi.demo.pardot.com");
  assertEquals(hostFromConnection(ctx.connection), "pi.demo.pardot.com");
});

Deno.test("client: a host outside the two documented ones is refused", () => {
  const { ctx } = mockPardotCtx([], "evil.example.com");
  assertThrows(() => hostFromConnection(ctx.connection), Error, "expected pi.pardot.com");
});

Deno.test("client: requests go to the demo host when the connection says so", async () => {
  const { ctx, calls } = mockPardotCtx([{ body: { values: [] } }], "pi.demo.pardot.com");
  await new PardotClient(ctx).request("/tags", {
    query: { fields: "id", limit: undefined, x: "" },
  });
  assertEquals(calls[0].url, "https://pi.demo.pardot.com/api/v5/objects/tags?fields=id");
});

Deno.test("client: never sets credentials or the business unit header itself", async () => {
  const { ctx, calls } = mockPardotCtx([{ body: {} }]);
  await new PardotClient(ctx).request("/tags/1", { method: "PATCH", body: { name: "n" } });
  assertEquals(Object.keys(calls[0].headers).sort(), ["accept", "content-type"]);
});

Deno.test("client: a datetime offset is URL-encoded as the docs require", async () => {
  const { ctx, calls } = mockPardotCtx([{ body: {} }]);
  await new PardotClient(ctx).request("/prospects", {
    query: { updatedAtAfter: "2026-01-01T00:00:00+05:00" },
  });
  assertEquals(calls[0].url.includes("updatedAtAfter=2026-01-01T00%3A00%3A00%2B05%3A00"), true);
});

Deno.test("client: errors carry status, path and the vendor code", async () => {
  const { ctx } = mockPardotCtx([{ status: 405, body: { code: 108, message: "Cannot delete" } }]);
  await assertRejects(
    () => new PardotClient(ctx).request("/tags/1", { method: "DELETE" }),
    Error,
    "Pardot 405 for DELETE /api/v5/objects/tags/1: [108] Cannot delete",
  );
});

Deno.test("client: a non-JSON error body is kept verbatim", async () => {
  const { ctx } = mockPardotCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  await assertRejects(() => new PardotClient(ctx).request("/tags"), Error, "bad gateway");
});

Deno.test("client: idOf accepts integers and digit strings only", () => {
  assertEquals(idOf(5), 5);
  assertEquals(idOf("42"), 42);
  for (const bad of [0, -1, 1.5, "a", "1/2", "", undefined, null]) {
    assertThrows(() => idOf(bad), Error, "positive integer");
  }
});

Deno.test("client: jsonObject / unset / errorText edge cases", () => {
  assertEquals(jsonObject(undefined, "x"), {});
  assertEquals(jsonObject('{"a":1}', "x"), { a: 1 });
  assertThrows(() => jsonObject("null", "x"), Error, "JSON object");
  assertEquals(unset(""), undefined);
  assertEquals(unset(0), 0);
  assertEquals(unset(false), false);
  assertEquals(errorText({ code: 49, message: "Access Denied" }), "[49] Access Denied");
  assertEquals(errorText({ message: "m" }), "m");
  assertEquals(errorText([1]), undefined);
  assertEquals(errorText("x"), undefined);
});
