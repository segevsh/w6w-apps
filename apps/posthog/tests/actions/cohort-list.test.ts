import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/cohort-list.ts";

const conn = { display: { region: "us", projectId: "999" } };

Deno.test("cohort-list: GETs /api/projects/{id}/cohorts/", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: { count: 0, results: [] } }],
    { connection: conn },
  );
  await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://us.posthog.com/api/projects/999/cohorts/");
});

Deno.test("cohort-list: search and pagination map to query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }], { connection: conn });
  await action.execute!({ search: "power users", limit: 5, offset: 10 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("search"), "power users");
  assertEquals(url.searchParams.get("limit"), "5");
  assertEquals(url.searchParams.get("offset"), "10");
});
