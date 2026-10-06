import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bulk-send-create.ts";

Deno.test("bulk-send-create: POSTs template_ids and the base64 CSV to /bulk_sends", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: "b1", status: "Created", documents_count: 2 },
  }]);
  const out = await action.execute!({
    template_ids: ["t1"],
    bulk_send_csv: "Y3N2",
    skip_row_errors: false,
    name: "Q4",
  }, ctx);
  assertEquals(out, { id: "b1", status: "Created", documents_count: 2 });
  assertEquals(calls[0].url, "https://www.signwell.com/api/v1/bulk_sends");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    template_ids: ["t1"],
    bulk_send_csv: "Y3N2",
    skip_row_errors: false,
    name: "Q4",
  });
  assertEquals(action.idempotent, false);
});

Deno.test("bulk-send-create: template_ids and the CSV are required; a 422 surfaces", async () => {
  const { ctx, calls } = mockCtx([{
    status: 422,
    body: { errors: { bulk_send_csv: ["is invalid"] } },
  }]);
  await assertRejects(
    async () => await action.execute!({ bulk_send_csv: "x" }, ctx),
    Error,
    "`template_ids`",
  );
  await assertRejects(
    async () => await action.execute!({ template_ids: ["t1"] }, ctx),
    Error,
    "`bulk_send_csv`",
  );
  assertEquals(calls.length, 0);
  await assertRejects(
    async () => await action.execute!({ template_ids: ["t1"], bulk_send_csv: "x" }, ctx),
    Error,
    "is invalid",
  );
});
