import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/appointment-get.ts";

Deno.test("appointment-get: GETs /appointments/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42 } }]);
  const result = await action.execute({ id: 42 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/appointments/42");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { id: 42 });
});

Deno.test("appointment-get: passes pastFormAnswers through as a query param", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42 } }]);
  await action.execute({ id: 42, pastFormAnswers: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("pastFormAnswers"), "true");
});
