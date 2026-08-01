import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx, mockUpstashCtx } from "../_helpers.ts";
import { pairsToObject, restUrlFromConnection, UpstashClient } from "../../lib/client.ts";

Deno.test("UpstashClient: never sends an Authorization header itself", async () => {
  const { ctx, calls } = mockUpstashCtx([{ body: { result: "PONG" } }]);
  await new UpstashClient(ctx).command("PING");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("UpstashClient: throws on a { error } response body", async () => {
  const { ctx } = mockUpstashCtx([{
    status: 400,
    body: { error: "ERR wrong number of arguments" },
  }]);
  await assertRejects(() => new UpstashClient(ctx).command("SET", "k"), Error, "ERR wrong number");
});

Deno.test("UpstashClient: throws on a non-2xx response with no body", async () => {
  const { ctx } = mockUpstashCtx([{
    status: 500,
    statusText: "Internal Server Error",
    body: undefined,
  }]);
  await assertRejects(() => new UpstashClient(ctx).command("PING"), Error, "500");
});

Deno.test("restUrlFromConnection: throws when the connection carries no REST URL", () => {
  const { ctx } = mockCtx();
  assertThrows(() => restUrlFromConnection(ctx.connection), Error, "no REST URL");
});

Deno.test("pairsToObject: folds a flat array into field -> value pairs", () => {
  assertEquals(pairsToObject(["a", "1", "b", "2"]), { a: "1", b: "2" });
});

Deno.test("pairsToObject: empty or non-array input yields {}", () => {
  assertEquals(pairsToObject([]), {});
  assertEquals(pairsToObject(undefined), {});
});
