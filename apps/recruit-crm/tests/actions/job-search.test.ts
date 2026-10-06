import { assertEquals } from "@std/assert";
import action from "../../actions/job-search.ts";
import { mockCtx, paginator, pathOf, queryOf } from "../_helpers.ts";

Deno.test("job-search: maps every filter onto the vendor's query names", async () => {
  const { ctx, calls } = mockCtx([{ body: paginator([{ slug: "9" }]) }]);
  await action.execute({
    name: "Engineer",
    jobStatus: 1,
    companyName: "Acme",
    contactEmail: "c@a.co",
    fullAddress: "1 Main St",
    sortBy: "name",
    sortOrder: "asc",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/jobs/search");
  assertEquals(queryOf(calls[0].url), {
    name: "Engineer",
    job_status: "1",
    company_name: "Acme",
    contact_email: "c@a.co",
    full_address: "1 Main St",
    sort_by: "name",
    sort_order: "asc",
  });
});

Deno.test("job-search: no filters sends a bare search URL", async () => {
  const { ctx, calls } = mockCtx([{ body: paginator([]) }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://api.recruitcrm.io/v1/jobs/search");
});
