import { assertEquals } from "@std/assert";
import opportunityCreate from "../../actions/opportunity-create.ts";
import { bodyOf, mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("opportunity-create: POSTs an opportunity with its stage relationship", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: single("opportunity", 2) }]);
  await opportunityCreate.execute({
    name: "Acme renewal",
    amount: 5000,
    closeDate: "2026-12-31T00:00:00Z",
    accountId: 1,
    opportunityStageId: 6,
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/opportunities");
  assertEquals(bodyOf(calls[0]), {
    data: {
      type: "opportunity",
      attributes: { name: "Acme renewal", amount: 5000, closeDate: "2026-12-31T00:00:00Z" },
      relationships: {
        account: { data: { type: "account", id: 1 } },
        opportunityStage: { data: { type: "opportunityStage", id: 6 } },
      },
    },
  });
});
