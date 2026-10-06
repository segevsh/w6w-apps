import { assertEquals } from "@std/assert";
import action from "../../actions/contact-enrich-job-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("contact-enrich-job-get: GET /v3/contacts/jobs/{jobId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const out = await action.execute!({ "jobId": "j 1" } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.lusha.com/v3/contacts/jobs/j%201");
  assertEquals(
    calls[0].headers["api_key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(calls[0].body, null);
  assertEquals(out, { ok: true });
});
