import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  compact,
  encodeId,
  errorText,
  formatRecruitError,
  multipartBody,
  pageOf,
  recordsOf,
  RecruitClient,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("errorText: reads error, message and errorMessage; nothing else", () => {
  assertEquals(errorText({ error: "Unauthorized" }), "Unauthorized");
  assertEquals(
    errorText({ message: "credential could not be resolved" }),
    "credential could not be resolved",
  );
  assertEquals(errorText({ error: true, errorMessage: "No such" }), "No such");
  assertEquals(errorText({ error: true }), undefined);
  assertEquals(errorText([]), undefined);
  assertEquals(errorText(null), undefined);
});

Deno.test("formatRecruitError: envelope, code, and raw fallback", () => {
  assertEquals(
    formatRecruitError(401, "GET", "/v1/x", '{"error":"Unauthorized"}'),
    "Recruit CRM 401 for GET /v1/x: Unauthorized",
  );
  assertEquals(
    formatRecruitError(
      404,
      "GET",
      "/v1/x",
      '{"error":true,"errorCode":"nf","errorMessage":"gone"}',
    ),
    "Recruit CRM 404 nf for GET /v1/x: gone",
  );
  assert(formatRecruitError(500, "GET", "/v1/x", "boom".repeat(500)).includes("truncated"));
});

Deno.test("pageOf / recordsOf: tolerate missing and odd shapes", () => {
  assertEquals(pageOf(undefined), {
    items: [],
    count: 0,
    currentPage: null,
    perPage: null,
    hasMore: false,
  });
  assertEquals(pageOf({ data: [1], next_page_url: "" }).hasMore, false);
  assertEquals(recordsOf(undefined), []);
  assertEquals(recordsOf([1]), [1]);
  assertEquals(recordsOf({ data: [2] }), [2]);
  assertEquals(recordsOf({ a: 1 }), [{ a: 1 }]);
});

Deno.test("compact / encodeId", () => {
  assertEquals(compact({ a: "", b: null, c: undefined, d: 0, e: false, f: "x" }), {
    d: 0,
    e: false,
    f: "x",
  });
  assertEquals(encodeId(" a/b "), "a%2Fb");
  assertThrows(() => encodeId(undefined), Error, "id");
});

Deno.test("multipartBody: a fresh boundary per body, values kept verbatim", () => {
  const a = multipartBody({ x: "line1\nline2", y: undefined });
  const b = multipartBody({ x: "1" });
  assert(a.type !== b.type);
  assert(a.body.includes('name="x"\r\n\r\nline1\nline2\r\n'));
  assert(!a.body.includes('name="y"'));
});

Deno.test("RecruitClient: non-JSON success body is an error, empty body is undefined", async () => {
  const bad = mockCtx([{ status: 200, body: "<html>", headers: { "content-type": "text/html" } }]);
  await assertRejects(() => new RecruitClient(bad.ctx).json("/x"), Error, "non-JSON");
  const empty = mockCtx([{ status: 200, body: undefined }]);
  assertEquals(await new RecruitClient(empty.ctx).json("/x"), undefined);
});

Deno.test("RecruitClient: sends accept JSON and never an authorization header", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new RecruitClient(ctx).json("/x", { query: { a: 1, b: "", c: undefined } });
  assertEquals(calls[0].url, "https://api.recruitcrm.io/v1/x?a=1");
  assertEquals(calls[0].headers.accept, "application/json");
  assertEquals(calls[0].headers.authorization, undefined);
});
