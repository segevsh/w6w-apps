import { assertEquals } from "@std/assert";
import transactionUpdateMetadata from "../../actions/transaction-update-metadata.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("transaction-update-metadata: POST /transactions/update_metadata, merges metadata", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        data: { id: "t1", type: "transaction", attributes: { metadata: { verified: true } } },
      },
    },
  ]);
  await transactionUpdateMetadata.execute({ id: "t1", metadata: '{"verified":true}' }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/integration_api/transactions/update_metadata");
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body, { id: "t1", metadata: { verified: true } });
});

Deno.test("transaction-update-metadata: omits metadata entirely when not given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "t1" } } }]);
  await transactionUpdateMetadata.execute({ id: "t1" }, ctx);
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals("metadata" in body, false);
});
