import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/person-list.ts";

const conn = { display: { region: "us", projectId: "999" } };

Deno.test("person-list: GETs /api/projects/{id}/persons/ with compacted query params", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: { count: 1, next: null, results: [{ id: 1 }] } }],
    { connection: conn },
  );
  const result = await action.execute!({ search: "ada", limit: 10 }, ctx);
  assertEquals(
    calls[0].url,
    "https://us.posthog.com/api/projects/999/persons/?search=ada&limit=10",
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { count: 1, next: null, results: [{ id: 1 }] });
});

Deno.test("person-list: honors region — routes to the EU host", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: { count: 0, results: [] } }],
    { connection: { display: { region: "eu", projectId: "999" } } },
  );
  await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://eu.posthog.com/api/projects/999/persons/");
});

Deno.test("person-list: distinctId and email map to distinct_id and email query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }], { connection: conn });
  await action.execute!({ distinctId: "user-1", email: "a@b.com" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("distinct_id"), "user-1");
  assertEquals(url.searchParams.get("email"), "a@b.com");
});
