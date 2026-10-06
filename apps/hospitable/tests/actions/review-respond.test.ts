import { assertEquals } from "@std/assert";
import reviewRespond from "../../actions/review-respond.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const requiredOf = (a: { params?: Array<{ key: string; required?: boolean }> }) =>
  (a.params ?? []).filter((p) => p.required).map((p) => p.key).sort();

Deno.test("review-respond: POST .../respond with the response text", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "rv1", responded_at: "2026-10-06T10:00:00Z" } }]);
  const out = await reviewRespond.execute({ uuid: "rv1", response: "Thank you!" }, ctx) as {
    id: string;
  };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/reviews/rv1/respond");
  assertEquals(JSON.parse(calls[0].body!), { response: "Thank you!" });
  assertEquals(out.id, "rv1");
  assertEquals(requiredOf(reviewRespond), ["response", "uuid"]);
});
