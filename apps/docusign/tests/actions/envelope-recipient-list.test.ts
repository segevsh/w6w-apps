import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { ACCOUNT_BASE, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/envelope-recipient-list.ts";

test("envelope-recipient-list: GETs /envelopes/{id}/recipients", async () => {
  const { ctx, calls } = mockCtx([{
    body: { signers: [{ status: "completed" }], recipientCount: "1" },
  }]);
  const out = await action.execute({ envelopeId: "e1" }, ctx) as {
    signers: Array<{ status: string }>;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), `${ACCOUNT_BASE}/envelopes/e1/recipients`);
  assertEquals(out.signers[0].status, "completed");
});

test("envelope-recipient-list: maps the include flags to snake_case", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    envelopeId: "e1",
    includeTabs: true,
    includeExtended: true,
    includeAnchorTabLocations: true,
    includeMetadata: true,
  }, ctx);
  const q = queryOf(calls[0]);
  assertEquals(q.get("include_tabs"), "true");
  assertEquals(q.get("include_extended"), "true");
  assertEquals(q.get("include_anchor_tab_locations"), "true");
  assertEquals(q.get("include_metadata"), "true");
});

test("envelope-recipient-list: sends no query when no flags are set", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ envelopeId: "e1" }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

test("envelope-recipient-list: is a read action grouped under recipient", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "recipient");
});
