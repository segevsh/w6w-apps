import { assertEquals } from "@std/assert";
import readerList from "../../actions/reader-list.ts";
import {
  listEnvelope,
  mockCtx,
  pathOf,
  PID,
  problem,
  PROBLEM_HEADERS,
  queryOf,
} from "../_helpers.ts";

Deno.test("reader-list: passes search_email", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([{ id: "r1" }]) }]);
  const out = await readerList.execute({ searchEmail: "r@example.com", pageSize: 5 }, ctx) as {
    items: unknown[];
  };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/readers`);
  assertEquals(queryOf(calls[0].url), { search_email: "r@example.com", page_size: "5" });
  assertEquals(calls[0].body, null);
  assertEquals(out.items.length, 1);
});

Deno.test("reader-list: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await readerList.execute({ searchEmail: "r@example.com", pageSize: 5 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
