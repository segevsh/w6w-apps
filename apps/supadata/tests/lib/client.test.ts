import { assertEquals, assertRejects } from "@std/assert";
import { batchSource } from "../../lib/batch.ts";
import {
  compact,
  encodeId,
  errorText,
  formatError,
  isErrorEnvelope,
  requireText,
  SupadataClient,
  toList,
  truncate,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: helpers", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: false, e: [], f: 0 }), {
    a: 1,
    d: false,
    f: 0,
  });
  assertEquals(truncate("abcdef", 3), "abc… (6 chars truncated)");
  assertEquals(encodeId(" a/b "), "a%2Fb");
  assertEquals(toList("a, b\nc,,"), ["a", "b", "c"]);
  assertEquals(toList(undefined), []);
  assertEquals(requireText(" x ", "L"), "x");
});

Deno.test("client: the vendor's error envelope is recognised and formatted", () => {
  const raw = JSON.stringify({ error: "limit-exceeded", message: "m", details: "Out of credits" });
  assertEquals(isErrorEnvelope(JSON.parse(raw)), true);
  assertEquals(isErrorEnvelope({ error: null, message: "m" }), false);
  assertEquals(isErrorEnvelope({ status: "failed", error: { error: "x" } }), false);
  assertEquals(errorText(raw), "limit-exceeded: Out of credits");
  assertEquals(errorText("<html><title>T</title></html>"), "T");
  assertEquals(errorText(""), "");
  assertEquals(formatError(429, "GET", "/x", raw).includes("credits are used up"), true);
});

Deno.test("client: json() sends no key, accepts an empty body, and rejects non-JSON", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }, { body: "<html>nope</html>" }]);
  assertEquals(await new SupadataClient(ctx).json("/a"), {});
  assertEquals(Object.keys(calls[0].headers).sort(), ["accept"]);
  await assertRejects(async () => await new SupadataClient(ctx).json("/b"), Error, "expected JSON");
});

Deno.test("client: json() throws on an error envelope even under a 2xx status", async () => {
  const { ctx } = mockCtx([{
    status: 206,
    body: { error: "transcript-unavailable", message: "m", details: "d" },
  }]);
  await assertRejects(
    async () => await new SupadataClient(ctx).json("/transcript"),
    Error,
    "transcript-unavailable",
  );
});

Deno.test("client: batchSource demands exactly one source", () => {
  assertEquals(batchSource({ videoIds: "a,b" }), { videoIds: ["a", "b"] });
  assertEquals(batchSource({ channelId: "c", limit: 3 }), { channelId: "c", limit: 3 });
  for (const bad of [{}, { playlistId: "p", channelId: "c" }]) {
    let threw = false;
    try {
      batchSource(bad);
    } catch {
      threw = true;
    }
    assertEquals(threw, true);
  }
});
