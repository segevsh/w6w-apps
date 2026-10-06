import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/contact-search.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("contact-search: sends POST /contacts/search and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{
    body: { count: 0, pageSize: 10, pageStartIndex: 0, items: [] },
  }]);
  const out = await action.execute(
    {
      startDate: "2026-01-01T00:00:00Z",
      endDate: "2026-02-01T00:00:00Z",
      searchTerm: "Smith",
      contactTypes: "Homeowner,Vendor",
      pageSize: 10,
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/contacts/search");
  assertEquals(queryOf(calls[0].url), { pageSize: "10" });
  assertEquals(JSON.parse(calls[0].body!), {
    contactTypes: ["Homeowner", "Vendor"],
    searchTerm: "Smith",
    startDate: "2026-01-01T00:00:00Z",
    endDate: "2026-02-01T00:00:00Z",
    sort: { sortDirection: "Descending", sortColumn: "CreatedDate" },
  });
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, { count: 0, pageSize: 10, pageStartIndex: 0, items: [] });
});

Deno.test("contact-search: a vendor error surfaces its title and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: problemBody(404, "Resource not found.") }]);
  await assertRejects(
    async () =>
      await action.execute(
        {
          startDate: "2026-01-01T00:00:00Z",
          endDate: "2026-02-01T00:00:00Z",
          searchTerm: "Smith",
          contactTypes: "Homeowner,Vendor",
          pageSize: 10,
        } as never,
        ctx,
      ),
    Error,
    "AccuLynx 404",
  );
});
