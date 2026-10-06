import { assertEquals } from "@std/assert";
import { mockSalesmateCtx } from "../_helpers.ts";
import update from "../../actions/activity-update.ts";

const B = "https://acme.salesmate.io/apis/activity/v4";
const ok = (Data: unknown) => ({ body: { Status: "success", Data } });

Deno.test("activity-update: PUTs to /activity/v4/:id without the id in the body", async () => {
  const { ctx, calls } = mockSalesmateCtx([ok({ id: 3 })]);
  await update.execute(
    { activityId: 3, ...{ "title": "Call", "owner": 1, "type": "Call" } } as never,
    ctx,
  );
  assertEquals(calls[0].url, `${B}/3`);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { "title": "Call", "owner": 1, "type": "Call" });
});
