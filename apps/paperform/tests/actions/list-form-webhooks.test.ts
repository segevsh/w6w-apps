import { assertEquals } from "@std/assert";
import listFormWebhooks from "../../actions/list-form-webhooks.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-form-webhooks: GETs /v1/forms/{slugOrId}/webhooks", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: listEnvelope({ webhooks: [{ id: "w1" }] }, { total: 1 }),
  }]);
  const out = await listFormWebhooks.execute({ slugOrId: "f1" }, ctx) as {
    results: unknown[];
    total?: number;
  };
  assertEquals(pathOf(calls[0].url), "/v1/forms/f1/webhooks");
  assertEquals(out.results.length, 1);
  assertEquals(out.total, 1);
});
