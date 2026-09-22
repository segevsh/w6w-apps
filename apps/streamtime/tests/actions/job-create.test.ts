import { assertEquals } from "@std/assert";
import jobCreate from "../../actions/job-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-create: POSTs /v2/jobs and returns the new job", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1010, name: "Website Redesign" } }]);
  const result = await jobCreate.execute(
    { companyId: 2001, name: "Website Redesign" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/jobs");
  assertEquals(bodyOf(calls[0]), { companyId: 2001, name: "Website Redesign" });
  assertEquals(result.id, 1010);
});

/**
 * The deviation, pinned: the `Job` schema marks `companyId` read-only, but every
 * other field that says which job this is is read-only too, and a job with no
 * company is not a job. It is exposed as a required param.
 */
Deno.test("job-create: companyId is exposed and required, despite the read-only annotation", () => {
  const param = (jobCreate.params ?? []).find((p) => p.key === "companyId");
  assertEquals(param?.required, true);
  assertEquals(param?.type, "number");
});

Deno.test("job-create: no other read-only field is exposed", () => {
  const keys = (jobCreate.params ?? []).map((p) => p.key);
  for (
    const readonly of ["isBillable", "exchangeRate", "fullName", "totalLoggedMinutes", "jobGroupId"]
  ) {
    assertEquals(keys.includes(readonly), false, readonly);
  }
});
