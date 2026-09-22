import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  asOptionalJson,
  compact,
  csv,
  formatLoftyError,
  intList,
  LoftyClient,
} from "../../lib/client.ts";

Deno.test("client: builds the documented host and prefix", async () => {
  const { ctx, calls } = mockCtx([{ body: { leadId: 1 } }]);
  await new LoftyClient(ctx).request("/leads/651095960136641");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.lofty.com/v1.0/leads/651095960136641");
});

Deno.test("client: serializes query values and drops the unset ones", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new LoftyClient(ctx).request("/leads", {
    query: { stage: "Pending", limit: 100, offset: 0, desc: false, email: undefined, key: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("stage"), "Pending");
  assertEquals(url.searchParams.get("limit"), "100");
  // 0 and false are meaningful values, not absences.
  assertEquals(url.searchParams.get("offset"), "0");
  assertEquals(url.searchParams.get("desc"), "false");
  assertEquals(url.searchParams.has("email"), false);
  assertEquals(url.searchParams.has("key"), false);
});

Deno.test("client: a JSON body is sent as JSON with a content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { leadId: 1 } }]);
  await new LoftyClient(ctx).request("/leads", {
    method: "POST",
    body: { firstName: "Bob", phones: ["+14155551234"] },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    firstName: "Bob",
    phones: ["+14155551234"],
  });
});

/**
 * The documented failure body is a JSON *string*, so the useful text is one
 * parse away.
 */
Deno.test("client: unwraps Lofty's JSON-string error body", async () => {
  const { ctx } = mockCtx([{ status: 401, body: '"invalid token"' }]);
  const err = await assertRejects(() => new LoftyClient(ctx).request("/me"), Error);
  assert(/Lofty 401 for GET \/v1.0\/me/.test(err.message), err.message);
  assert(/invalid token/.test(err.message), err.message);
  assert(/Settings > Integrations > API/.test(err.message), err.message);
});

Deno.test("client: keeps a non-string error body verbatim", async () => {
  const { ctx } = mockCtx([{ status: 500, body: '{"weird":true}' }]);
  const err = await assertRejects(() => new LoftyClient(ctx).request("/leads"), Error);
  assert(/\{"weird":true\}/.test(err.message), err.message);
});

Deno.test("client: a non-JSON success body is an error, not a silent empty result", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>nope</html>" }]);
  const err = await assertRejects(() => new LoftyClient(ctx).request("/leads"), Error);
  assert(/did not return JSON/.test(err.message), err.message);
});

Deno.test("client: an empty body parses as undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: undefined }]);
  assertEquals(await new LoftyClient(ctx).request("/tasks/1"), undefined);
});

Deno.test("client: status() returns the HTTP status for a bodyless response", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const status = await new LoftyClient(ctx).status("/tasks/1", { method: "DELETE" });
  assertEquals(status, 200);
  assertEquals(calls[0].method, "DELETE");
});

Deno.test("client: status() still throws on a failure", async () => {
  const { ctx } = mockCtx([{ status: 400, body: '"bad request"' }]);
  await assertRejects(
    () => new LoftyClient(ctx).status("/tasks/1", { method: "DELETE" }),
    Error,
  );
});

Deno.test("compact: drops unset values but keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x", g: [] }),
    { d: false, e: 0, f: "x", g: [] },
  );
});

Deno.test("csv: splits a form field into a list, or leaves it unset", () => {
  assertEquals(csv("a, b ,c"), ["a", "b", "c"]);
  assertEquals(csv(["x", "y"]), ["x", "y"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv(undefined), undefined);
  assertEquals(csv(" , "), undefined);
});

Deno.test("intList: parses integers and rejects non-numbers", () => {
  assertEquals(intList("1, 2,5"), [1, 2, 5]);
  assertEquals(intList("-1"), [-1]);
  assertEquals(intList(undefined), undefined);
  assertThrows(() => intList("1,x"), Error, "is not an integer");
});

Deno.test("asOptionalJson: accepts a parsed value or raw JSON, and rejects junk", () => {
  assertEquals(asOptionalJson({ a: 1 }, "p"), { a: 1 });
  assertEquals(asOptionalJson('{"a":1}', "p"), { a: 1 });
  assertEquals(asOptionalJson("", "p"), undefined);
  assertEquals(asOptionalJson(undefined, "p"), undefined);
  assertThrows(() => asOptionalJson("{nope", "`property`"), Error, "`property` is not valid JSON");
});

Deno.test("formatLoftyError: names the operation even with no body", () => {
  assertEquals(formatLoftyError(403, "GET", "/v1.0/org", ""), "Lofty 403 for GET /v1.0/org");
});
