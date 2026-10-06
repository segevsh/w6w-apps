import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/record-list.ts";
import { mockCtx } from "../_helpers.ts";

const PAGE = {
  success: true,
  data: {
    PrimaryKey: "accountid",
    PrimaryField: "accountname",
    Total_Records: 120,
    Page_Size: 50,
    Page_Number: 1,
    Records: [{ accountid: "a1", accountname: "Acme" }],
  },
  message: "",
};

Deno.test("record-list: sends GET /api/record/{object} with lowercase paging params", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const out = await action.execute!({ object: "account", pageSize: 50, pageNumber: 1 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.fireberry.com");
  assertEquals(url.pathname, "/api/record/account");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), { pagesize: "50", pagenumber: "1" });
  assertEquals(calls[0].body, null);
  assertEquals(out, {
    records: [{ accountid: "a1", accountname: "Acme" }],
    primaryKey: "accountid",
    primaryField: "accountname",
    totalRecords: 120,
    pageNumber: 1,
    pageSize: 50,
    hasMore: true,
  });
});

Deno.test("record-list: hasMore is false on the last page and a custom object number is encoded", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { Total_Records: 3, Page_Size: 50, Page_Number: 1, Records: [] } },
  }]);
  const out = await action.execute!({ object: "1001" }, ctx) as { hasMore: boolean };
  assertEquals(new URL(calls[0].url).pathname, "/api/record/1001");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.hasMore, false);
});

Deno.test("record-list: sends no tokenid header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await action.execute!({ object: "account" }, ctx);
  assert(!("tokenid" in calls[0].headers), "the sign hook injects credentials, not actions");
  assert(!("authorization" in calls[0].headers));
});

Deno.test("record-list: surfaces Fireberry's capital-M Message as a thrown error", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { Message: "Invalid Object Name" } }]);
  await assertRejects(
    async () => await action.execute!({ object: "nope" }, ctx),
    Error,
    "Invalid Object Name",
  );
});

Deno.test("record-list: declares type and output", () => {
  assertEquals(action.type, "search");
  assert(action.params!.some((p) => p.key === "object" && p.required));
  assert(Array.isArray(action.output) && action.output.length > 0);
});
