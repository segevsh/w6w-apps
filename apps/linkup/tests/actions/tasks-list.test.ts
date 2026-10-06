import { assertEquals } from "@std/assert";
import tasksList from "../../actions/tasks-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("tasks-list: repeats type and status filters", async () => {
  const body = { data: [{ id: "t" }], metadata: { page: 1 }, quota: { inFlight: 1, limit: 10 } };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await tasksList.execute({
    type: ["search", "fetch"],
    status: ["pending"],
    pageSize: 20,
  }, ctx);
  assertEquals(out, { items: [{ id: "t" }], metadata: { page: 1 }, quota: body.quota });
  assertEquals(
    calls[0].url,
    "https://api.linkup.so/v1/tasks?type=search&type=fetch&status=pending&pageSize=20",
  );
});
