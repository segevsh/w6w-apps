import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/job-cancel.ts";

const conn = { display: { tenantId: "42", environment: "production" } };

Deno.test("job-cancel: PUTs reasonId and memo to /cancel and tolerates the empty 200 body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }], conn);
  const out = await action.execute!({ id: 5, reasonId: 2, memo: "Customer moved" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://api.servicetitan.io/jpm/v2/tenant/42/jobs/5/cancel");
  assertEquals(JSON.parse(calls[0].body!), { reasonId: 2, memo: "Customer moved" });
  assertEquals(out, { ok: true });
});
