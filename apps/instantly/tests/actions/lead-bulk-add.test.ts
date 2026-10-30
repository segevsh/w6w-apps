import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import leadBulkAdd from "../../actions/lead-bulk-add.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const LEADS = [{ email: "a@b.com" }, { email: "c@d.com" }];

test("lead-bulk-add: POSTs /leads/add with the parsed leads array", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", leads_uploaded: 2 } }]);
  const out = await leadBulkAdd.execute(
    { campaign_id: "c1", leads: LEADS },
    ctx,
  ) as { leads_uploaded: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/leads/add");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.campaign_id, "c1");
  assertEquals(body.leads, LEADS);
  assertEquals(out.leads_uploaded, 2);
});

test("lead-bulk-add: leads accepts the JSON string form a user types", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await leadBulkAdd.execute({ list_id: "list1", leads: JSON.stringify(LEADS) }, ctx);
  assertEquals(JSON.parse(calls[0].body!).leads, LEADS);
});

test("lead-bulk-add: leads is required — fails before any request when absent", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await leadBulkAdd.execute({ campaign_id: "c1", leads: undefined }, ctx),
    Error,
    "Leads is required",
  );
  assertEquals(calls.length, 0);
});

test("lead-bulk-add: is declared non-idempotent", () => {
  assertEquals(leadBulkAdd.idempotent, false);
});
