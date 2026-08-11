import { assertEquals } from "@std/assert";
import jobTypeList from "../../actions/job-type-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("job-type-list: calls GET /job_fields/job_types", async () => {
  const { ctx, calls } = mockCtx([{ body: page("job_types", [{ id: "jt1", name: "Repair" }]) }]);
  const out = await jobTypeList.execute({ name: "Repair" }, ctx);

  assertEquals(pathOf(calls[0].url), "/job_fields/job_types");
  assertEquals(queryOf(calls[0].url), { name: "Repair" });
  assertEquals(out.items, [{ id: "jt1", name: "Repair" }]);
});

Deno.test("job-type-list: sends no pagination — the endpoint documents none", async () => {
  const { ctx, calls } = mockCtx([{ body: page("job_types", []) }]);
  await jobTypeList.execute({}, ctx);

  assertEquals(queryOf(calls[0].url), {});
  const keys = (jobTypeList.params ?? []).map((p) => p.key);
  assertEquals(keys.includes("page"), false);
  assertEquals(keys.includes("pageSize"), false);
});
