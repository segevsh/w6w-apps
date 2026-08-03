import { assertEquals } from "@std/assert";
import { ACCOUNT_BASE, hostOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/envelope-list.ts";

Deno.test("envelope-list: GETs the account's envelopes on the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: { envelopes: [] } }]);
  await action.execute({ fromDate: "2026-01-01T00:00:00Z" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(hostOf(calls[0]), "na4.docusign.net");
  assertEquals(pathOf(calls[0]), `${ACCOUNT_BASE}/envelopes`);
  assertEquals(queryOf(calls[0]).get("from_date"), "2026-01-01T00:00:00Z");
});

Deno.test("envelope-list: maps every filter to Docusign's snake_case query names", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    fromDate: "2026-01-01",
    toDate: "2026-02-01",
    status: "sent,completed",
    envelopeIds: "e1,e2",
    folderIds: "inbox",
    searchText: "nda",
    orderBy: "last_modified",
    order: "desc",
    include: "recipients",
    userId: "u-1",
    count: 50,
    startPosition: 100,
  }, ctx);

  const q = queryOf(calls[0]);
  assertEquals(q.get("to_date"), "2026-02-01");
  assertEquals(q.get("status"), "sent,completed");
  assertEquals(q.get("envelope_ids"), "e1,e2");
  assertEquals(q.get("folder_ids"), "inbox");
  assertEquals(q.get("search_text"), "nda");
  assertEquals(q.get("order_by"), "last_modified");
  assertEquals(q.get("order"), "desc");
  assertEquals(q.get("include"), "recipients");
  assertEquals(q.get("user_id"), "u-1");
  assertEquals(q.get("count"), "50");
  assertEquals(q.get("start_position"), "100");
});

Deno.test("envelope-list: sends no query at all when nothing is set", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("envelope-list: from_date is optional — Docusign owns that rule", () => {
  const fromDate = action.params?.find((p) => p.key === "fromDate");
  assertEquals(fromDate?.required, undefined);
  assertEquals(action.type, "search");
  assertEquals(action.resource, "envelope");
});
