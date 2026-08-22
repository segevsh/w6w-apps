import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/time-off-request-list.ts";

const conn = { display: { environment: "production", companyId: "co-1" } };

Deno.test("time-off-request-list: filters by status and type", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ uuid: "t1" }] }], conn);
  await action.execute!({ status: "pending", requestType: "vacation" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/companies/co-1/time_off_requests");
  assertEquals(url.searchParams.get("status"), "pending");
  assertEquals(url.searchParams.get("request_type"), "vacation");
});

/** Pending is a plan, approved is a fact. */
Deno.test("time-off-request-list: the description distinguishes the two", () => {
  assert(/pending is a plan/i.test(action.description!), action.description);
});
