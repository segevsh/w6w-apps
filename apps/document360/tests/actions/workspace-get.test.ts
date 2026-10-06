import { assertEquals } from "@std/assert";
import workspaceGet from "../../actions/workspace-get.ts";
import { envelope, mockCtx, pathOf, PID, problem, PROBLEM_HEADERS, queryOf } from "../_helpers.ts";

Deno.test("workspace-get: GETs the workspace", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: envelope({ id: "w1", language_code: "en" }),
  }]);
  const out = await workspaceGet.execute({ workspaceId: "w1" }, ctx) as { language_code: string };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/workspaces/w1`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out.language_code, "en");
});

Deno.test("workspace-get: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await workspaceGet.execute({ workspaceId: "w1" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
