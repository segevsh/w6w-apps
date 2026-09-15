import { assertEquals } from "@std/assert";
import mailboxList from "../../actions/mailbox-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("mailbox-list: GETs /parser with pagination defaults omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1, name: "Invoices" }]) }]);
  const out = await mailboxList.execute({}, ctx) as { results: unknown[] };

  assertEquals(pathOf(calls[0].url), "/parser");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out.results.length, 1);
});

Deno.test("mailbox-list: forwards page, pageSize, search and ordering", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await mailboxList.execute(
    { page: 2, pageSize: 10, search: "invoice", ordering: "-document_count" },
    ctx,
  );

  assertEquals(queryOf(calls[0].url), {
    page: "2",
    page_size: "10",
    search: "invoice",
    ordering: "-document_count",
  });
});

Deno.test("mailbox-list: is type search with no idempotent flag", () => {
  assertEquals(mailboxList.type, "search");
  assertEquals(mailboxList.idempotent, undefined);
});
