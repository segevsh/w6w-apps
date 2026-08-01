import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/annotation-create.ts";

const conn = { display: { region: "us", projectId: "999" } };

Deno.test("annotation-create: POSTs /api/projects/{id}/annotations/ with content", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 201, body: { id: 1, content: "Deployed v2" } }],
    { connection: conn },
  );
  const result = await action.execute!({ content: "Deployed v2" }, ctx);
  assertEquals(calls[0].url, "https://us.posthog.com/api/projects/999/annotations/");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.content, "Deployed v2");
  assertEquals(result, { id: 1, content: "Deployed v2" });
});

Deno.test("annotation-create: scope and additionalFields map to snake_case body fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], { connection: conn });
  await action.execute!(
    {
      content: "Incident",
      dateMarker: "2026-08-01T00:00:00Z",
      scope: "dashboard",
      additionalFields: {
        creationType: "GIT",
        dashboardId: 42,
        emoji: "🔥",
        hiddenInUserInterface: true,
      },
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.date_marker, "2026-08-01T00:00:00Z");
  assertEquals(body.scope, "dashboard");
  assertEquals(body.creation_type, "GIT");
  assertEquals(body.dashboard_id, 42);
  assertEquals(body.emoji, "🔥");
  assertEquals(body.hidden_in_user_interface, true);
});

Deno.test("annotation-create: requires content", async () => {
  const { ctx, calls } = mockCtx([], { connection: conn });
  await assertRejects(async () => await action.execute!({ content: "" }, ctx), Error, "content");
  assertEquals(calls.length, 0);
});
