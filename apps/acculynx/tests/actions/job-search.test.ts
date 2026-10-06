import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/job-search.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("job-search: sends POST /jobs/search and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{
    body: { count: 0, pageSize: 25, pageStartIndex: 0, items: [] },
  }]);
  const out = await action.execute(
    {
      searchTerm: "Maple Lane",
      latitude: 40.6,
      longitude: -74.0,
      mapRadius: 1,
      pageSize: 25,
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/jobs/search");
  assertEquals(queryOf(calls[0].url), { pageSize: "25" });
  assertEquals(JSON.parse(calls[0].body!), {
    searchTerm: "Maple Lane",
    geoLocation: { latitude: 40.6, longitude: -74.0, mapRadius: 1 },
  });
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, { count: 0, pageSize: 25, pageStartIndex: 0, items: [] });
});

Deno.test("job-search: a vendor error surfaces its title and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: problemBody(404, "Resource not found.") }]);
  await assertRejects(
    async () =>
      await action.execute(
        {
          searchTerm: "Maple Lane",
          latitude: 40.6,
          longitude: -74.0,
          mapRadius: 1,
          pageSize: 25,
        } as never,
        ctx,
      ),
    Error,
    "AccuLynx 404",
  );
});

Deno.test("job-search: refuses a search with neither a term nor coordinates", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute({} as never, ctx), Error, "search term");
  assertEquals(calls.length, 0);
});

Deno.test("job-search: a lone latitude is not a location", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ latitude: 1 } as never, ctx),
    Error,
    "search term",
  );
  assertEquals(calls.length, 0);
});
