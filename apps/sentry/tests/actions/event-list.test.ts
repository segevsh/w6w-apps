import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/event-list.ts";

const display = { organizationSlug: "acme" };

Deno.test("event-list: reads a project's raw event stream", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "e1" }] }], { display });
  const result = await action.execute!({ projectSlug: "backend", full: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/0/projects/acme/backend/events/");
  assertEquals(url.searchParams.get("full"), "true");
  assertEquals(result, [{ id: "e1" }]);
});

Deno.test("event-list: a missing project slug fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "`projectSlug` is required",
  );
  assertEquals(calls.length, 0);
});
