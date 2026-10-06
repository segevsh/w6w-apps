import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  asAddress,
  asOptionalAddress,
  asOptionalJson,
  buildQuery,
  compact,
  cursorFromUrl,
  encodeId,
  formatLobError,
  LobClient,
  stripBankSecrets,
  truncate,
} from "../../lib/client.ts";
import { idempotencyKeyFor, mailBody } from "../../lib/mail.ts";
import { pageQuery, sortBy, toArray } from "../../lib/params.ts";
import { bodyOf, errorBody, mockCtx } from "../_helpers.ts";

Deno.test("compact: drops unset values but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("buildQuery: bracket form for objects and arrays", () => {
  const q = buildQuery({
    limit: 5,
    include: ["total_count"],
    date_created: { gt: "2026-01-01", lt: undefined },
    metadata: { campaign: "c" },
    size: ["4x6", "6x9"],
    skip: undefined,
  });
  assertEquals(q.get("limit"), "5");
  assertEquals(q.getAll("include[]"), ["total_count"]);
  assertEquals(q.get("date_created[gt]"), "2026-01-01");
  assertEquals(q.has("date_created[lt]"), false);
  assertEquals(q.get("metadata[campaign]"), "c");
  assertEquals(q.getAll("size[]"), ["4x6", "6x9"]);
  assertEquals(q.has("skip"), false);
});

Deno.test("cursorFromUrl: extracts after/before and tolerates junk", () => {
  assertEquals(cursorFromUrl("https://api.lob.com/v1/x?limit=2&after=ABC", "after"), "ABC");
  assertEquals(cursorFromUrl("https://api.lob.com/v1/x?before=Z", "before"), "Z");
  assertEquals(cursorFromUrl(null, "after"), null);
  assertEquals(cursorFromUrl("not a url", "after"), null);
});

Deno.test("asAddress: ids pass through, JSON strings parse, objects pass, empty throws", () => {
  assertEquals(asAddress(" adr_1 ", "To"), "adr_1");
  assertEquals(asAddress('{"name":"A"}', "To"), { name: "A" });
  assertEquals(asAddress({ name: "A" }, "To"), { name: "A" });
  assertThrows(() => asAddress("", "To"), Error, "To is required");
  assertThrows(() => asAddress("{bad", "To"), Error, "To is not valid JSON");
  assertEquals(asOptionalAddress(undefined, "From"), undefined);
});

Deno.test("asOptionalJson: parses strings and passes values through", () => {
  assertEquals(asOptionalJson("[1]", "x"), [1]);
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(asOptionalJson("", "x"), undefined);
});

Deno.test("encodeId / truncate", () => {
  assertEquals(encodeId(" adr_1/../x "), "adr_1%2F..%2Fx");
  assertEquals(truncate("a".repeat(700)).length < 700, true);
});

Deno.test("formatLobError: keeps the machine code, adds rate-limit guidance, handles non-JSON", () => {
  const msg = formatLobError(
    401,
    "GET",
    "/v1/addresses",
    JSON.stringify(errorBody("invalid_api_key", "Your API key is not valid.", 401)),
  );
  assert(msg.includes("401 invalid_api_key"));
  assert(msg.includes("Your API key is not valid."));
  assert(
    formatLobError(
      429,
      "POST",
      "/v1/x",
      JSON.stringify(errorBody("rate_limit_exceeded", "slow", 429)),
    ).includes("150 requests per 5 seconds"),
  );
  assert(formatLobError(502, "GET", "/v1/x", "<html>").includes("502"));
});

Deno.test("stripBankSecrets: removes account_number only, tolerates non-objects", () => {
  assertEquals(
    stripBankSecrets<Record<string, unknown>>({
      id: "b",
      account_number: "1",
      routing_number: "2",
    }),
    {
      id: "b",
      routing_number: "2",
    },
  );
  assertEquals(stripBankSecrets(null), null);
  assertEquals(stripBankSecrets([1]), [1]);
});

Deno.test("LobClient.json: appends the path to /v1, sends JSON, and omits the key from the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x" } }]);
  await new LobClient(ctx).json("/addresses", {
    method: "POST",
    body: { a: 1 },
    idempotencyKey: "k",
  });
  assertEquals(calls[0].url, "https://api.lob.com/v1/addresses");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["idempotency-key"], "k");
  assertEquals(bodyOf(calls[0]), { a: 1 });
  assertEquals("authorization" in calls[0].headers, false, "credentials belong to sign only");
});

Deno.test("LobClient.json: an empty 200 body yields undefined; a failure throws with the code", async () => {
  const empty = mockCtx([{ body: undefined }]);
  assertEquals(await new LobClient(empty.ctx).json("/x"), undefined);
  const failed = mockCtx([{ status: 404, body: errorBody("not_found", "gone", 404) }]);
  await assertRejects(() => new LobClient(failed.ctx).json("/x"), Error, "not_found");
});

Deno.test("LobClient.list: flattens the page and only adds include[] when asked", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: [{ id: 1 }, { id: 2 }],
      count: 2,
      total_count: 9,
      next_url: "https://api.lob.com/v1/x?after=N",
      previous_url: "https://api.lob.com/v1/x?before=P",
    },
  }, { body: { data: [] } }]);
  const page = await new LobClient(ctx).list("/x", { limit: 2 }, { includeTotal: true });
  assertEquals(page, {
    items: [{ id: 1 }, { id: 2 }],
    count: 2,
    totalCount: 9,
    nextCursor: "N",
    previousCursor: "P",
  });
  assert(calls[0].url.includes("include%5B%5D=total_count"));
  const second = await new LobClient(ctx).list("/x");
  assertEquals(second.items, []);
  assert(!calls[1].url.includes("include"));
});

Deno.test("pageQuery / sortBy / toArray", () => {
  assertEquals(pageQuery({ limit: 3, after: "a" }), { limit: 3, after: "a" });
  assertThrows(() => pageQuery({ after: "a", before: "b" }), Error, "only one");
  assertEquals(sortBy("send_date:asc"), { send_date: "asc" });
  assertEquals(sortBy(undefined), undefined);
  assertEquals(toArray("4x6, 6x9"), ["4x6", "6x9"]);
  assertEquals(toArray([]), undefined);
});

Deno.test("mailBody / idempotencyKeyFor: use type is mandatory; the key falls back to the invocation id", () => {
  assertThrows(() => mailBody({ to: "adr_1" }), Error, "Use type is required");
  assertEquals(mailBody({ to: "adr_1", useType: "marketing", sendDate: "2026-12-01" }), {
    to: "adr_1",
    use_type: "marketing",
    send_date: "2026-12-01",
  });
  const { ctx } = mockCtx();
  assertEquals(idempotencyKeyFor({ to: "x", idempotencyKey: "own" }, ctx), "own");
  assertEquals(idempotencyKeyFor({ to: "x" }, ctx), undefined);
});
