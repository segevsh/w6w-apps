import { assertEquals, assertRejects } from "@std/assert";
import timeEntryList from "../../actions/time-entry-list.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("time-entry-list: GET /time_entries with every filter, sort, include and page serialised", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": [{ "id": "1", "type": "time_entries", "attributes": { "name": "x" } }],
      "meta": { "total_count": 1, "current_page": 1, "total_pages": 1, "page_size": 30 },
      "links": {},
    },
  }]);
  const out = await timeEntryList.execute({
    "personId": 7,
    "projectId": 7,
    "taskId": 7,
    "serviceId": 7,
    "dealId": 7,
    "date": "2026-10-01",
    "after": "2026-10-01",
    "before": "2026-10-01",
    "billable": true,
    "sort": "-name",
    "include": "company",
    "pageSize": 5,
    "pageNumber": 2,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/time_entries");
  assertEquals(queryOf(calls[0].url), {
    "filter[person_id]": "7",
    "filter[project_id]": "7",
    "filter[task_id]": "7",
    "filter[service_id]": "7",
    "filter[deal_id]": "7",
    "filter[date]": "2026-10-01",
    "filter[after]": "2026-10-01",
    "filter[before]": "2026-10-01",
    "filter[billable]": "true",
    "sort": "-name",
    "include": "company",
    "page[size]": "5",
    "page[number]": "2",
  });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(calls[0].headers["x-auth-token"], undefined, "credentials belong to sign");
  assertEquals(calls[0].headers["x-organization-id"], undefined);
  assertEquals(out.count, 1);
  assertEquals(out.totalCount, 1);
  assertEquals(out.hasMore, false);
  assertEquals((out.items as Record<string, unknown>[])[0].id, "1");
  assertEquals((out.items as Record<string, unknown>[])[0].name, "x");
});

Deno.test("time-entry-list: a next link becomes nextCursor, and the cursor is sent back as page[after]", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        data: [],
        links: { next: "https://api.productive.io/api/v2/time_entries?page%5Bafter%5D=abc123" },
      },
    },
    { status: 200, body: { data: [] } },
  ]);
  const first = await timeEntryList.execute({ cursorPaging: true, pageSize: 2 }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(queryOf(calls[0].url), { "page[after]": "", "page[size]": "2" });
  assertEquals(first.hasMore, true);
  assertEquals(first.nextCursor, "abc123");
  await timeEntryList.execute({ cursor: "abc123" }, ctx);
  assertEquals(queryOf(calls[1].url), { "page[after]": "abc123" });
});

Deno.test("time-entry-list: a raw filter object is merged with the typed filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await timeEntryList.execute({ filter: '{"name": {"contains": "x"}, "id": [1, 2]}' }, ctx);
  assertEquals(queryOf(calls[0].url), { "filter[name][contains]": "x", "filter[id]": "1,2" });
});

Deno.test("time-entry-list: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("422", "unprocessable_entity", "Invalid", "is invalid"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(timeEntryList.execute({}, ctx)),
    Error,
  );
  assertEquals(err.message.includes("422"), true, err.message);
  assertEquals(err.message.includes("is invalid"), true, err.message);
});

Deno.test("time-entry-list: declares search", () => {
  assertEquals(timeEntryList.type, "search");
  assertEquals(timeEntryList.idempotent, undefined);
  assertEquals(timeEntryList.key, "time-entry-list");
});
