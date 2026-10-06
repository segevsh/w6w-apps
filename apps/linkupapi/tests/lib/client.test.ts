import { assertEquals, assertRejects } from "@std/assert";
import { compact, encodeId, formatError, LinkupApiClient } from "../../lib/client.ts";
import { mapInput, multi } from "../../lib/params.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: a 200 with success:false is still an error", async () => {
  const { ctx } = mockCtx([{
    body: { success: false, error: { code: "CHANNEL_ERROR", message: "no seat" } },
  }]);
  await assertRejects(
    () => new LinkupApiClient(ctx).act("profiles", "get_me", "a1", {}),
    Error,
    "CHANNEL_ERROR",
  );
});

Deno.test("client: a non-JSON 200 is an error, not a result", async () => {
  const { ctx } = mockCtx([{ body: "<html>", headers: { "content-type": "text/html" } }]);
  await assertRejects(
    () => new LinkupApiClient(ctx).request("GET", "/v2/credits"),
    Error,
    "not JSON",
  );
});

Deno.test("client: query is URL-encoded and empty values are dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: [] } }]);
  await new LinkupApiClient(ctx).request("GET", "/v2/logs", {
    query: { action: "a b", limit: 5, status: "" },
  });
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/logs?action=a+b&limit=5");
});

Deno.test("client: enrichment calls carry no account_id; others require one", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: {} } }]);
  await new LinkupApiClient(ctx).act("enrich", "validate_email", undefined, { email: "a@b.c" });
  assertEquals(JSON.parse(calls[0].body!), {
    action: "validate_email",
    params: { email: "a@b.c" },
  });
  await assertRejects(
    () => new LinkupApiClient(ctx).act("profiles", "get_me", "  ", {}),
    Error,
    "accountId is required",
  );
});

Deno.test("client: formatError names the code and a hint", () => {
  const msg = formatError(
    402,
    "POST",
    "/v2/content",
    JSON.stringify({ error: { code: "INSUFFICIENT_CREDITS", message: "x" } }),
  );
  assertEquals(msg.includes("INSUFFICIENT_CREDITS") && msg.includes("top up"), true);
});

Deno.test("client: encodeId and compact", () => {
  assertEquals(encodeId(" a/b "), "a%2Fb");
  assertEquals(compact({ a: 1, b: "", c: null, d: false }), { a: 1, d: false });
});

Deno.test("params: multi splits on semicolons; one value stays a string", () => {
  assertEquals(multi("a; b ;;c"), ["a", "b", "c"]);
  assertEquals(multi("a"), "a");
  assertEquals(multi(" ; "), undefined);
  assertEquals(multi(["x", " y "]), ["x", "y"]);
});

Deno.test("params: mapInput maps names, coerces numbers and keeps false", () => {
  const out = mapInput(
    { profileUrl: " u ", count: "7", useCache: false, skip: undefined, loc: "a;b" },
    [["profileUrl", "profile_url", "s"], ["count", "count", "n"], ["useCache", "use_cache", "b"], [
      "skip",
      "skip",
      "s",
    ], ["loc", "location", "m"]],
  );
  assertEquals(out, { profile_url: "u", count: 7, use_cache: false, location: ["a", "b"] });
  try {
    mapInput({ count: "x" }, [["count", "count", "n"]]);
    throw new Error("expected a throw");
  } catch (e) {
    assertEquals((e as Error).message, "count must be a number");
  }
});
