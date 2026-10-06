import { assertEquals } from "@std/assert";
import labelList from "../../actions/label-list.ts";
import {
  listEnvelope,
  mockCtx,
  pathOf,
  PID,
  problem,
  PROBLEM_HEADERS,
  queryOf,
} from "../_helpers.ts";

Deno.test("label-list: passes the search term", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: listEnvelope([{ id: "l1", name: "beta" }]),
  }]);
  const out = await labelList.execute({ search: "beta" }, ctx) as { items: unknown[] };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/labels`);
  assertEquals(queryOf(calls[0].url), { search: "beta" });
  assertEquals(calls[0].body, null);
  assertEquals(out.items.length, 1);
});

Deno.test("label-list: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await labelList.execute({ search: "beta" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
