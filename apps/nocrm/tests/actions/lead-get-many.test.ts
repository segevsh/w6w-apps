import { assertEquals, assertRejects } from "@std/assert";
import { mockNocrmCtx } from "../_helpers.ts";
import action from "../../actions/lead-get-many.ts";

Deno.test("lead-get-many: sends every documented filter and the paging pair", async () => {
  const { ctx, calls } = mockNocrmCtx([{
    body: [{ id: 1 }],
    headers: { "content-type": "application/json", "x-total-count": "180" },
  }]);
  const page = await action.execute({
    direction: "asc",
    order: "creation_date",
    limit: 50,
    offset: 100,
    status: ["todo", "standby"],
    step: "Incoming,1189",
    starred: false,
    userId: "stef@example.com",
    email: "john@acme.test",
    tags: "vip,US",
    fieldKey: "Phone",
    fieldValue: "06",
    updatedAfter: "2026-01-01",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/leads");
  assertEquals(url.searchParams.get("direction"), "asc");
  assertEquals(url.searchParams.get("order"), "creation_date");
  assertEquals(url.searchParams.get("limit"), "50");
  assertEquals(url.searchParams.get("offset"), "100");
  // The document takes statuses comma-separated, so a multiselect joins them.
  assertEquals(url.searchParams.get("status"), "todo,standby");
  assertEquals(url.searchParams.get("step"), "Incoming,1189");
  assertEquals(url.searchParams.get("starred"), "false");
  assertEquals(url.searchParams.get("user_id"), "stef@example.com");
  assertEquals(url.searchParams.get("email"), "john@acme.test");
  assertEquals(url.searchParams.get("tags"), "vip,US");
  assertEquals(url.searchParams.get("field_key"), "Phone");
  assertEquals(url.searchParams.get("field_value"), "06");
  assertEquals(url.searchParams.get("updated_after"), "2026-01-01");
  assertEquals(page.items, [{ id: 1 }]);
  assertEquals(page.totalCount, 180);
});

Deno.test("lead-get-many: omits what the caller left unset", async () => {
  const { ctx, calls } = mockNocrmCtx([{ body: [] }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/v2/leads");
});

Deno.test("lead-get-many: a bad parameter format is reported with the vendor's type", async () => {
  const { ctx } = mockNocrmCtx([{
    status: 400,
    body: {
      error: 400,
      message: "Bad parameter format",
      type: "bad_parameter_format",
    },
  }]);
  await assertRejects(
    () => Promise.resolve(action.execute({ direction: "sideways" }, ctx)),
    Error,
    "bad_parameter_format",
  );
});
