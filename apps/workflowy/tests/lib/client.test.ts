import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { compact, formatError, seg, sortByPriority, WorkflowyClient } from "../../lib/client.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client: formatError reads the vendor's string `errors` body", () => {
  assertEquals(
    formatError(401, { errors: "Invalid Credentials, try again." }),
    "Workflowy API error 401: Invalid Credentials, try again.",
  );
  assertEquals(formatError(500, null), "Workflowy API error 500");
  assertEquals(formatError(502, "bad gateway"), "Workflowy API error 502: bad gateway");
});

Deno.test("client: compact drops undefined, null and empty strings but keeps false/0", () => {
  assertEquals(compact({ a: "x", b: undefined, c: null, d: "", e: false, f: 0 }), {
    a: "x",
    e: false,
    f: 0,
  });
});

Deno.test("client: seg encodes ids and rejects blanks", () => {
  assertEquals(seg("2026-01-15"), "2026-01-15");
  assertEquals(seg("a/b"), "a%2Fb");
  assertThrows(() => seg("  "), Error, "id is required");
});

Deno.test("client: sortByPriority orders ascending without mutating", () => {
  const input = [{ priority: 300 }, { priority: 100 }, { priority: 200 }];
  assertEquals(sortByPriority(input).map((n) => n.priority), [100, 200, 300]);
  assertEquals(input[0].priority, 300);
});

Deno.test("client: request builds the URL, query and JSON body; no auth header", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: 1 } }]);
  await new WorkflowyClient(ctx).request("/nodes", {
    method: "POST",
    query: { parent_id: "inbox", skip: undefined },
    body: { name: "x" },
  });
  assertEquals(pathOf(calls[0].url), "/api/v1/nodes");
  assertEquals(queryOf(calls[0].url), { parent_id: "inbox" });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].body, '{"name":"x"}');
});

Deno.test("client: a failure throws with the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Invalid Credentials, try again." } }]);
  await assertRejects(
    () => new WorkflowyClient(ctx).request("/targets"),
    Error,
    "Workflowy API error 401: Invalid Credentials, try again.",
  );
});
