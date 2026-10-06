import { assert, assertEquals, assertRejects } from "@std/assert";
import { asObject, compact, formatLexwareError, LexwareClient } from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("formatLexwareError: reads the legacy IssueList shape", () => {
  const msg = formatLexwareError(
    406,
    "POST",
    "/v1/contacts",
    JSON.stringify({
      IssueList: [{
        i18nKey: "missing_entity",
        source: "company.name",
        type: "validation_failure",
      }],
    }),
  );
  assert(msg.includes("missing_entity (company.name)"), msg);
});

Deno.test("formatLexwareError: reads the regular shape with details, and 429 guidance", () => {
  const reg = formatLexwareError(
    406,
    "POST",
    "/v1/invoices",
    JSON.stringify({
      message: "Validation failed",
      details: [{ field: "a.b", violation: "NOTNULL" }],
    }),
  );
  assert(reg.includes("a.b: NOTNULL"), reg);
  const rl = formatLexwareError(
    429,
    "GET",
    "/v1/contacts",
    JSON.stringify({ message: "Too many" }),
  );
  assert(rl.includes("2 requests per second"), rl);
});

Deno.test("formatLexwareError: falls back to raw text for a non-JSON body", () => {
  assert(
    formatLexwareError(502, "GET", "/v1/x", "<html>bad gateway</html>").includes("bad gateway"),
  );
});

Deno.test("compact keeps false and 0, drops empty values; asObject accepts objects and JSON strings", () => {
  assertEquals(compact({ a: false, b: 0, c: "", d: null, e: undefined, f: "x" }), {
    a: false,
    b: 0,
    f: "x",
  });
  assertEquals(asObject('{"a":1}', "X"), { a: 1 });
});

Deno.test("LexwareClient.json: returns undefined on an empty body and throws on non-2xx", async () => {
  const empty = mockCtx([{ status: 204 }]);
  assertEquals(
    await new LexwareClient(empty.ctx).json("/articles/x", { method: "DELETE" }),
    undefined,
  );
  const bad = mockCtx([{
    status: 500,
    body: { message: "Internal server error or rate limit exceeded" },
  }]);
  await assertRejects(() => new LexwareClient(bad.ctx).json("/profile"), Error, "rate limit");
});
