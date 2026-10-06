import { assertEquals } from "@std/assert";
import userGet from "../../actions/user-get.ts";
import { envelope, mockCtx, pathOf, PID, problem, PROBLEM_HEADERS, queryOf } from "../_helpers.ts";

Deno.test("user-get: GETs the user", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: envelope({ id: "u1", email: "ann@example.com" }),
  }]);
  const out = await userGet.execute({ userId: "u1" }, ctx) as { email: string };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/users/u1`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out.email, "ann@example.com");
});

Deno.test("user-get: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await userGet.execute({ userId: "u1" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
