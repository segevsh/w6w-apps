import { assertEquals } from "@std/assert";
import categoryGet from "../../actions/category-get.ts";
import { envelope, mockCtx, pathOf, PID, problem, PROBLEM_HEADERS, queryOf } from "../_helpers.ts";

Deno.test("category-get: GETs the category", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({ id: "c1", name: "Guides" }) }]);
  const out = await categoryGet.execute({ categoryId: "c1" }, ctx) as { name: string };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/categories/c1`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out.name, "Guides");
});

Deno.test("category-get: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await categoryGet.execute({ categoryId: "c1" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
