import { assertEquals } from "@std/assert";
import action from "../../actions/list-scheduled-messages.ts";
import { exec, mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-scheduled-messages: GETs /v1/message-schedules with status and domain filters", async () => {
  const body = page([{ message_id: "m1", status: "scheduled" }]);
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await exec(action, { domainId: "d1", status: "scheduled", limit: 20 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/message-schedules");
  assertEquals(queryOf(calls[0].url), { domain_id: "d1", status: "scheduled", limit: "20" });
  assertEquals(out, body);
});

Deno.test("list-scheduled-messages: status options are scheduled, sent, error", () => {
  const options = action.params!.find((p) => p.key === "status")!.options as { value: string }[];
  assertEquals(options.map((o) => o.value), ["scheduled", "sent", "error"]);
});
