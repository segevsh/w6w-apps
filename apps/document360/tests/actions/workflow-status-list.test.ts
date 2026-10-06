import { assertEquals } from "@std/assert";
import workflowStatusList from "../../actions/workflow-status-list.ts";
import {
  listEnvelope,
  mockCtx,
  pathOf,
  PID,
  problem,
  PROBLEM_HEADERS,
  queryOf,
} from "../_helpers.ts";

Deno.test("workflow-status-list: lists statuses", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: listEnvelope([{ id: "s1", name: "In review" }]),
  }]);
  const out = await workflowStatusList.execute({}, ctx) as { items: unknown[] };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/workflow-statuses`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out.items.length, 1);
});

Deno.test("workflow-status-list: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await workflowStatusList.execute({}, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
