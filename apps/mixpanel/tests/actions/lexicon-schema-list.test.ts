import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/lexicon-schema-list.ts";

const conn = { display: { projectId: "123", region: "us" } };

/** The project is in the path here, so it must not also be a parameter. */
Deno.test("lexicon-schema-list: puts the project in the path, not the query", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [] } }], conn);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/app/projects/123/schemas");
  assertEquals(url.searchParams.get("project_id"), null);
});

Deno.test("lexicon-schema-list: an entity type narrows the path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ entityType: "event" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/app/projects/123/schemas/event");
});
