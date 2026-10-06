import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/job-message-create.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("job-message-create: sends POST /jobs/j1/messages and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { messageId: "m1" } }]);
  const out = await action.execute({ jobId: "j1", message: "Crew on site" } as never, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/jobs/j1/messages");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body!), { message: "Crew on site" });
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, { messageId: "m1" });
});

Deno.test("job-message-create: a vendor error surfaces its title and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: problemBody(404, "Resource not found.") }]);
  await assertRejects(
    async () => await action.execute({ jobId: "j1", message: "Crew on site" } as never, ctx),
    Error,
    "AccuLynx 404",
  );
});
