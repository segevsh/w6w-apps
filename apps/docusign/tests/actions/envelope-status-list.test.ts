import { assertEquals, assertThrows } from "@std/assert";
import { ACCOUNT_BASE, bodyOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action, { idList } from "../../actions/envelope-status-list.ts";

Deno.test("envelope-status-list: PUTs the ids in the body with the request_body sentinel", async () => {
  const { ctx, calls } = mockCtx([{ body: { envelopes: [] } }]);
  await action.execute({ envelopeIds: "e1,e2,e3" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0]), `${ACCOUNT_BASE}/envelopes/status`);
  assertEquals(queryOf(calls[0]).get("envelope_ids"), "request_body");
  assertEquals(bodyOf(calls[0]), { envelopeIds: ["e1", "e2", "e3"] });
});

Deno.test("envelope-status-list: splits on commas, spaces and newlines", () => {
  assertEquals(idList("a, b\nc  d,,e"), ["a", "b", "c", "d", "e"]);
  assertEquals(idList("   "), []);
});

Deno.test("envelope-status-list: rejects an empty id list before calling Docusign", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(
    () => action.execute({ envelopeIds: " , " }, ctx),
    Error,
    "at least one envelope GUID",
  );
  assertEquals(calls.length, 0);
});

Deno.test("envelope-status-list: offers no date filters — Docusign takes exactly one selector", () => {
  const keys = (action.params ?? []).map((p) => p.key);
  assertEquals(keys.includes("fromDate"), false);
  assertEquals(keys.includes("toDate"), false);
  assertEquals(keys, ["envelopeIds", "status", "count", "startPosition"]);
});

Deno.test("envelope-status-list: is a read action despite the PUT verb", () => {
  assertEquals(action.type, "read");
  assertEquals(action.idempotent, undefined);
});
