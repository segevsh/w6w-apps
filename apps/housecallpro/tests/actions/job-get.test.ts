import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import jobGet from "../../actions/job-get.ts";
import { mockCtx, pathOf, queryAll } from "../_helpers.ts";

test("job-get: calls GET /jobs/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "j1", work_status: "scheduled" } }]);
  const out = await jobGet.execute({ jobId: "j1" }, ctx) as { work_status: string };

  assertEquals(pathOf(calls[0].url), "/jobs/j1");
  assertEquals(out.work_status, "scheduled");
});

test("job-get: expand travels as expand[]", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await jobGet.execute({ jobId: "j1", expand: ["attachments", "appointments"] }, ctx);
  assertEquals(queryAll(calls[0].url, "expand[]"), ["attachments", "appointments"]);
});

test("job-get: declares the money fields so a reader sees they are cents", () => {
  const keys = (jobGet.output as Array<{ key: string; label: string }>).map((o) => o.key);
  assertEquals(keys.includes("total_amount"), true);
  const total = (jobGet.output as Array<{ key: string; label: string }>)
    .find((o) => o.key === "total_amount");
  assertEquals(total?.label.includes("cents"), true);
});
