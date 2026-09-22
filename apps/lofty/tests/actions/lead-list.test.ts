import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/lead-list.ts";

const envelope = {
  get_metadata: { offset: 0, limit: 100, total: 2, collection: 2 },
  leads: [{ leadId: 1, firstName: "Bob" }, { leadId: 2, firstName: "Ann" }],
};

Deno.test("lead-list: serializes the filters and keeps a false boolean", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope }]);
  const result = await action.execute!({
    stage: "Pending",
    assignedUserId: 100,
    contacted: false,
    allTags: "Hot Lead,Zillow",
    limit: 25,
    offset: 50,
  }, ctx) as typeof envelope;

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1.0/leads");
  assertEquals(url.searchParams.get("stage"), "Pending");
  assertEquals(url.searchParams.get("assignedUserId"), "100");
  assertEquals(url.searchParams.get("contacted"), "false");
  assertEquals(url.searchParams.get("allTags"), "Hot Lead,Zillow");
  assertEquals(url.searchParams.get("limit"), "25");
  assertEquals(url.searchParams.get("offset"), "50");
  assertEquals(result.leads.length, 2);
  assertEquals(result.get_metadata.total, 2);
});

Deno.test("lead-list: unset filters are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope }]);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

/** `roleAssigneeFilters` is a query parameter carrying a JSON document. */
Deno.test("lead-list: a json role filter is serialized into the query", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope }]);
  await action.execute!({
    roleAssigneeFilters: [{ roleName: "Agent", assigneeToIds: [111, 222] }],
  }, ctx);
  const raw = new URL(calls[0].url).searchParams.get("roleAssigneeFilters");
  assertEquals(JSON.parse(raw!), [{ roleName: "Agent", assigneeToIds: [111, 222] }]);
});

Deno.test("lead-list: prefills the API's documented page maximum", () => {
  const limit = action.params!.find((p) => p.key === "limit")!;
  assertEquals(limit.default, 100);
  assert(/maximum is 100/.test(limit.hint!), limit.hint);
});
