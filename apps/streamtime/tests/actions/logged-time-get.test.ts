import { assertEquals } from "@std/assert";
import loggedTimeGet from "../../actions/logged-time-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("logged-time-get: reads GET /v2/logged_times/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 555, minutes: 90, jobId: 90 } }]);
  const result = await loggedTimeGet.execute({ loggedTimeId: 555 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2/logged_times/555");
  assertEquals(result.minutes, 90);
});
