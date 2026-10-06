import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/job-note-create.ts";

const conn = { display: { tenantId: "42", environment: "production" } };

Deno.test("job-note-create: POSTs text, pinning only when asked", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { text: "hi", isPinned: true } },
    { status: 200, body: { text: "yo", isPinned: false } },
  ], conn);
  await action.execute!({ id: 5, text: "hi", pinToTop: true }, ctx);
  await action.execute!({ id: 5, text: "yo" }, ctx);
  assertEquals(calls[0].url, "https://api.servicetitan.io/jpm/v2/tenant/42/jobs/5/notes");
  assertEquals(JSON.parse(calls[0].body!), { text: "hi", pinToTop: true });
  assertEquals(JSON.parse(calls[1].body!), { text: "yo" });
});
