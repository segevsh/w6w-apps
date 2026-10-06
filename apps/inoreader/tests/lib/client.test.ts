import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  buildSearch,
  errorText,
  formatError,
  InoreaderClient,
  readZoneUsage,
  splitIds,
  streamPath,
} from "../../lib/client.ts";
import { mockCtx, pathOf, text } from "../_helpers.ts";

Deno.test("buildSearch: drops unset values and repeats arrays", () => {
  const p = buildSearch({ a: "x", b: undefined, c: "", d: 0, i: ["1", 2] });
  assertEquals(p.toString(), "a=x&d=0&i=1&i=2");
});

Deno.test("errorText: strips Error= and collapses an HTML page", () => {
  assertEquals(errorText("Error=Please enter password\n"), "Please enter password");
  assertEquals(errorText("<!DOCTYPE html><html>blocked</html>"), "(HTML error page)");
  assert(errorText("x".repeat(400)).endsWith("(truncated)"));
});

Deno.test("formatError: each documented status says what to do", () => {
  assert(
    formatError(401, "GET", "/user-info", "OAuth token not found or invalid.").includes(
      "reconnect",
    ),
  );
  assert(formatError(429, "GET", "/user-info", "").includes("zone 1 = reads, zone 2 = writes"));
  assert(formatError(403, "GET", "/user-info", "AppId required!").includes("AppId required!"));
  assert(formatError(400, "POST", "/edit-tag", "").includes("mandatory parameter"));
  assert(formatError(503, "GET", "/x", "").includes("(empty body)"));
});

Deno.test("readZoneUsage: reads the five documented headers", () => {
  const h = new Headers({
    "X-Reader-Zone1-Limit": "100",
    "X-Reader-Zone2-Limit": "100",
    "X-Reader-Zone1-Usage": "7",
    "X-Reader-Zone2-Usage": "3",
    "X-Reader-Limits-Reset-After": "1416",
  });
  assertEquals(readZoneUsage(h), {
    zone1Limit: 100,
    zone2Limit: 100,
    zone1Usage: 7,
    zone2Usage: 3,
    resetAfterSeconds: 1416,
  });
  assertEquals(readZoneUsage(new Headers()).zone1Limit, undefined);
});

Deno.test("streamPath / splitIds", () => {
  assertEquals(streamPath("feed/http://a.b/c"), "feed%2Fhttp%3A%2F%2Fa.b%2Fc");
  assertEquals(splitIds(" 1, 2\n3 ,, "), ["1", "2", "3"]);
  assertEquals(splitIds(undefined), []);
});

Deno.test("client.json: parses JSON, rejects a non-JSON 200 and a non-object", async () => {
  const a = mockCtx([{ body: { ok: 1 } }]);
  assertEquals(await new InoreaderClient(a.ctx).json("/user-info"), { ok: 1 });
  assertEquals(pathOf(a.calls[0].url), "/reader/api/0/user-info");

  const b = mockCtx([text("<html>shell</html>")]);
  await assertRejects(() => new InoreaderClient(b.ctx).json("/user-info"), Error, "non-JSON");

  const c = mockCtx([{ body: "[1]" }, { body: "5" }]);
  await assertRejects(() => new InoreaderClient(c.ctx).json("/x"), Error, "not an object");
  await assertRejects(() => new InoreaderClient(c.ctx).json("/x"), Error, "not an object");
});

Deno.test("client.ok: only the literal OK passes — Error= on HTTP 200 and other bodies fail", async () => {
  const good = mockCtx([text("OK")]);
  await new InoreaderClient(good.ctx).ok("/edit-tag", { query: { a: "x" } });
  assertEquals(good.calls[0].method, "POST");

  const err200 = mockCtx([text("Error=Bad tag", 200)]);
  await assertRejects(() => new InoreaderClient(err200.ctx).ok("/edit-tag"), Error, "Bad tag");

  const other = mockCtx([text("<html>edge</html>")]);
  await assertRejects(
    () => new InoreaderClient(other.ctx).ok("/edit-tag"),
    Error,
    "did not confirm",
  );

  const http = mockCtx([text("Error=nope", 400)]);
  await assertRejects(() => new InoreaderClient(http.ctx).ok("/edit-tag"), Error, "Inoreader 400");
});
