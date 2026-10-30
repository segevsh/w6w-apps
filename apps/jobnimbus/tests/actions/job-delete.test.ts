import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import jobDelete from "../../actions/job-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("job-delete: PUTs {is_active: false}", async () => {
  const { ctx, calls } = mockCtx([{ body: { jnid: "j1", is_active: false } }]);
  const out = await jobDelete.execute({ jnid: "j1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api1/jobs/j1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { is_active: false });
  assertEquals(out, { jnid: "j1", is_active: false });
});

test("job-delete: is marked idempotent", () => {
  assertEquals(jobDelete.idempotent, true);
});
