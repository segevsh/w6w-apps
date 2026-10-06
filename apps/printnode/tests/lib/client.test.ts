import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  compact,
  formatError,
  PrintNodeClient,
  stripWebhookSecrets,
  toOptionalSet,
  toSet,
} from "../../lib/client.ts";
import { errorBody, mockCtx } from "../_helpers.ts";

Deno.test("toSet: normalises numbers, arrays and spaced strings", () => {
  assertEquals(toSet(5, "x"), "5");
  assertEquals(toSet("1, 3 ,5", "x"), "1,3,5");
  assertEquals(toSet([1, 2], "x"), "1,2");
});

Deno.test("toSet: rejects anything that could escape the URL path", () => {
  for (const bad of ["", "1/2", "1,../x", "0", "-1", "a", "1?x=1"]) {
    assertThrows(() => toSet(bad, "Ids"));
  }
  assertEquals(toOptionalSet(undefined, "x"), undefined);
  assertEquals(toOptionalSet("", "x"), undefined);
  assertEquals(toOptionalSet([], "x"), undefined);
});

Deno.test("compact keeps false and 0", () => {
  assertEquals(compact({ a: false, b: 0, c: "", d: null, e: undefined, f: "x" }), {
    a: false,
    b: 0,
    f: "x",
  });
});

Deno.test("formatError: keeps code, message and the support uid", () => {
  const msg = formatError(401, JSON.stringify(errorBody("BadRequest", "API Key not found", "u9")));
  assertEquals(msg, "PrintNode 401 BadRequest: API Key not found [request u9]");
  assertEquals(formatError(502, "<html>"), "PrintNode 502: <html>");
});

Deno.test("list: reads Records-Total from the header", async () => {
  const { ctx } = mockCtx([{
    body: [{ id: 1 }, { id: 2 }],
    headers: { "content-type": "application/json", "records-total": "7" },
  }]);
  const out = await new PrintNodeClient(ctx).list("/computers");
  assertEquals(out, { items: [{ id: 1 }, { id: 2 }], count: 2, total: 7 });
});

Deno.test("list: no total when the header is absent; non-array body throws", async () => {
  const a = mockCtx([{ body: [] }]);
  assertEquals(await new PrintNodeClient(a.ctx).list("/computers"), { items: [], count: 0 });
  const b = mockCtx([{ body: { nope: 1 } }]);
  await assertRejects(() => new PrintNodeClient(b.ctx).list("/computers"), Error, "non-array");
});

Deno.test("client: a failed request throws the formatted vendor error", async () => {
  const { ctx } = mockCtx([{ status: 429, body: errorBody("TooManyRequests", "slow down") }]);
  await assertRejects(
    () => new PrintNodeClient(ctx).json("/computers"),
    Error,
    "429 TooManyRequests: slow down",
  );
});

Deno.test("client: never sets an authorization header (sign owns credentials)", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new PrintNodeClient(ctx).list("/computers", { limit: 5, dir: undefined });
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].url, "https://api.printnode.com/computers?limit=5");
});

Deno.test("stripWebhookSecrets removes secret from every webhook and passes others through", () => {
  const out = stripWebhookSecrets([{ webhookId: 1, secret: "s", url: "u" }]) as unknown;
  assertEquals(out, [{ webhookId: 1, url: "u" }]);
  assertEquals(stripWebhookSecrets({ a: 1 }), { a: 1 });
});
