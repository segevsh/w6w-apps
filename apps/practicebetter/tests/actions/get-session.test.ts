import { assertEquals } from "@std/assert";
import action from "../../actions/get-session.ts";
import { API_ROOT, mockCtx, queryOf, urlOf } from "../_helpers.ts";

const session = {
  id: "sess-1",
  duration: 60,
  confirmationStatus: "confirmed",
  cancelled: false,
};

Deno.test("get-session: reads /consultant/sessions/{sessionId}", async () => {
  const { ctx, calls } = mockCtx([{ body: session }]);
  const result = await action.execute({ sessionId: "sess-1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(urlOf(calls[0]), `${API_ROOT}/consultant/sessions/sess-1`);
  assertEquals(result, session);
});

Deno.test("get-session: recordId is sent only when supplied", async () => {
  const bare = mockCtx([{ body: session }]);
  await action.execute({ sessionId: "sess-1" }, bare.ctx);
  assertEquals(new URL(bare.calls[0].url).search, "");

  const scoped = mockCtx([{ body: session }]);
  await action.execute({ sessionId: "sess-1", recordId: "rec-1" }, scoped.ctx);
  assertEquals(queryOf(scoped.calls[0].url).recordId, "rec-1");
});

Deno.test("get-session: output names the scheduling fields a follow-up step reads", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "session");
  assertEquals((action.output as Array<{ key: string }>).map((o) => o.key), [
    "id",
    "clientRecord",
    "consultant",
    "dateCreated",
    "duration",
    "endDate",
    "confirmationStatus",
    "cancelled",
    "location",
    "notes",
  ]);
  assertEquals(action.params!.find((p) => p.key === "sessionId")!.required, true);
  assertEquals(action.params!.find((p) => p.key === "recordId")!.required, undefined);
});
