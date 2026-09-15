import { assertEquals } from "@std/assert";
import documentList from "../../actions/document-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("document-list: GETs /parser/{id}/document_set with filters", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1 }]) }]);
  await documentList.execute(
    {
      mailboxId: "42",
      status: "PARSEDOK",
      receivedAfter: "2026-01-01",
      receivedBefore: "2026-02-01",
      timezone: "Asia/Singapore",
      withResult: true,
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/parser/42/document_set");
  assertEquals(queryOf(calls[0].url), {
    status: "PARSEDOK",
    received_after: "2026-01-01",
    received_before: "2026-02-01",
    tz: "Asia/Singapore",
    with_result: "true",
  });
});

Deno.test("document-list: withResult omitted leaves with_result unset", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await documentList.execute({ mailboxId: "42" }, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
