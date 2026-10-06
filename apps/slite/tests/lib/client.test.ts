import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { compact, errorId, errorText, queryString, SliteClient, toList } from "../../lib/client.ts";
import { attributeList, kmQuery, listPosition, seg } from "../../lib/params.ts";
import { mockCtx, slError } from "../_helpers.ts";

Deno.test("compact drops unset values but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("toList splits CSV, trims, and returns undefined when empty", () => {
  assertEquals(toList(" a, b ,,c"), ["a", "b", "c"]);
  assertEquals(toList(["x", " y "]), ["x", "y"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList([]), undefined);
});

Deno.test("queryString repeats array keys and encodes values", () => {
  assertEquals(queryString({ a: ["1", "2"], b: "x y", c: undefined }), "?a=1&a=2&b=x+y");
  assertEquals(queryString({}), "");
});

Deno.test("errorText / errorId read Slite's {id, message} envelope", () => {
  const body = slError("rate-limit", "slow");
  assertEquals(errorText(body), "slow");
  assertEquals(errorId(body), "rate-limit");
  assertEquals(errorText("nope"), undefined);
  assertEquals(errorId(null), undefined);
});

Deno.test("seg requires a value and URL-encodes it", () => {
  assertEquals(seg(" a/b ", "id"), "a%2Fb");
  assertThrows(() => seg("", "noteId"), Error, "noteId is required");
});

Deno.test("listPosition: keywords and positive numbers pass, others throw", () => {
  assertEquals(listPosition(undefined), undefined);
  assertEquals(listPosition("top"), "top");
  assertEquals(listPosition("12.5"), 12.5);
  assertEquals(listPosition(3), 3);
  for (const bad of ["0", "abc"]) {
    assertThrows(
      () => listPosition(bad),
      Error,
      "listPosition must be top, bottom or a positive number",
    );
  }
});

Deno.test("attributeList keeps blanks between commas so columns stay aligned", () => {
  assertEquals(attributeList("a,,c"), ["a", "", "c"]);
  assertEquals(attributeList(undefined), undefined);
  assertEquals(attributeList([]), undefined);
});

Deno.test("kmQuery drops the review-state and recency filters for the short variants", () => {
  const input = { reviewStateList: "Verified", sinceDaysAgo: 3, first: 5, ownerIdList: "u" };
  assertEquals(kmQuery(input, true).reviewStateList, ["Verified"]);
  assertEquals(kmQuery(input, false).reviewStateList, undefined);
  assertEquals(kmQuery(input, false).sinceDaysAgo, undefined);
});

Deno.test("client: requests carry no credential and POST bodies are JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await new SliteClient(ctx).request("/x", { method: "POST", body: { a: 1 } });
  assertEquals(calls[0].url, "https://api.slite.com/v1/x");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, '{"a":1}');
});

Deno.test("client: a non-JSON 200 throws, and a non-JSON error keeps the raw text", async () => {
  const ok = mockCtx([{ body: "<html>shell</html>", headers: { "content-type": "text/html" } }]);
  await assertRejects(async () => await new SliteClient(ok.ctx).get("/x"), Error, "not JSON");
  const bad = mockCtx([{ status: 502, body: "Bad gateway" }]);
  await assertRejects(
    async () => await new SliteClient(bad.ctx).get("/x"),
    Error,
    "Slite 502: Bad gateway",
  );
});

Deno.test("client: requestRaw reports the status and Retry-After header", async () => {
  const { ctx } = mockCtx([{
    status: 202,
    headers: { "content-type": "application/json", "retry-after": "3" },
    body: { status: "processing" },
  }]);
  const res = await new SliteClient(ctx).requestRaw("/ask");
  assertEquals(res.status, 202);
  assertEquals(res.retryAfter, "3");
});
