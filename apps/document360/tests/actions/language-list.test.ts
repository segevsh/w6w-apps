import { assertEquals } from "@std/assert";
import languageList from "../../actions/language-list.ts";
import {
  listEnvelope,
  mockCtx,
  pathOf,
  PID,
  problem,
  PROBLEM_HEADERS,
  queryOf,
} from "../_helpers.ts";

Deno.test("language-list: passes workspace_id", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: listEnvelope([{ code: "en", name: "English", is_default: true }]),
  }]);
  const out = await languageList.execute({ workspaceId: "w1" }, ctx) as { items: unknown[] };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/languages`);
  assertEquals(queryOf(calls[0].url), { workspace_id: "w1" });
  assertEquals(calls[0].body, null);
  assertEquals(out.items.length, 1);
});

Deno.test("language-list: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await languageList.execute({ workspaceId: "w1" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
