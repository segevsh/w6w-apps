import { assertEquals } from "@std/assert";
import { mockCtx, optionValues } from "../_helpers.ts";
import action from "../../actions/search-opportunities.ts";

Deno.test("search-opportunities: POSTs to /opportunities/search", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/opportunities/search");
});

Deno.test("search-opportunities: maps every filter onto Copper's body keys", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute({
    name: "Big deal",
    statusIds: [0, 1],
    pipelineIds: [213214],
    pipelineStageIds: [987790],
    companyIds: [2],
    primaryContactIds: [7],
    assigneeIds: [-2],
    customerSourceIds: [331242],
    tags: ["q4"],
    minimumMonetaryValue: 100,
    maximumMonetaryValue: 900,
    minimumCloseDate: 1,
    maximumCloseDate: 2,
    minimumModifiedDate: 3,
    maximumModifiedDate: 4,
    sortBy: "date_modified",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Big deal",
    status_ids: [0, 1],
    pipeline_ids: [213214],
    pipeline_stage_ids: [987790],
    company_ids: [2],
    primary_contact_ids: [7],
    assignee_ids: [-2],
    customer_source_ids: [331242],
    tags: ["q4"],
    minimum_monetary_value: 100,
    maximum_monetary_value: 900,
    minimum_close_date: 1,
    maximum_close_date: 2,
    minimum_modified_date: 3,
    maximum_modified_date: 4,
    sort_by: "date_modified",
  });
});

Deno.test("search-opportunities: pins Copper's hard-coded status ids 0-3", () => {
  // "The possible values are 0, 1, 2, 3, for Open, Won, Lost, and Abandoned."
  assertEquals(optionValues(action, "statusIds"), [0, 1, 2, 3]);
});

Deno.test("search-opportunities: is a search on the opportunity resource", () => {
  assertEquals(action.type, "search");
  assertEquals(action.resource, "opportunity");
});
