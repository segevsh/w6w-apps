import { assertEquals } from "@std/assert";
import documentGetByUrl from "../../actions/document-get-by-url.ts";
import { envelope, mockCtx, pathOf, PID, problem, PROBLEM_HEADERS, queryOf } from "../_helpers.ts";

Deno.test("document-get-by-url: sends url and the two flags", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({ id: "a1", title: "Start" }) }]);
  const out = await documentGetByUrl.execute({ url: "/start", isPublished: false }, ctx) as {
    title: string;
  };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/document`);
  assertEquals(queryOf(calls[0].url), { url: "/start", is_published: "false" });
  assertEquals(calls[0].body, null);
  assertEquals(out.title, "Start");
});

Deno.test("document-get-by-url: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await documentGetByUrl.execute({ url: "/start", isPublished: false }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
