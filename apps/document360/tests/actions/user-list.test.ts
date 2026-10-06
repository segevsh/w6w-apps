import { assertEquals } from "@std/assert";
import userList from "../../actions/user-list.ts";
import {
  listEnvelope,
  mockCtx,
  pathOf,
  PID,
  problem,
  PROBLEM_HEADERS,
  queryOf,
} from "../_helpers.ts";

Deno.test("user-list: passes the search term", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: listEnvelope([{ id: "u1", email: "ann@example.com" }]),
  }]);
  const out = await userList.execute({ search: "ann" }, ctx) as { items: unknown[] };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/users`);
  assertEquals(queryOf(calls[0].url), { search: "ann" });
  assertEquals(calls[0].body, null);
  assertEquals(out.items.length, 1);
});

Deno.test("user-list: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await userList.execute({ search: "ann" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
