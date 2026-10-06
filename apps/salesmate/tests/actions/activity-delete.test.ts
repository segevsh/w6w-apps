import { assertEquals } from "@std/assert";
import { mockSalesmateCtx } from "../_helpers.ts";
import del from "../../actions/activity-delete.ts";

const B = "https://acme.salesmate.io/apis/activity/v4";
const ok = (Data: unknown) => ({ body: { Status: "success", Data } });

Deno.test("activity-delete: DELETEs /activity/v4/:id", async () => {
  const { ctx, calls } = mockSalesmateCtx([ok({})]);
  assertEquals(await del.execute({ activityId: 3 } as never, ctx), { deleted: true, id: 3 });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url.startsWith(`${B}/3`), true);
  assertEquals(calls[0].url, `${B}/3?hardDelete=false`);
});
