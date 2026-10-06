import { assertEquals } from "@std/assert";
import categoryUpdate from "../../actions/category-update.ts";
import { envelope, mockCtx, pathOf, PID, problem, PROBLEM_HEADERS, queryOf } from "../_helpers.ts";

Deno.test("category-update: PATCHes only what was set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({ id: "c1", name: "Renamed" }) }]);
  const out = await categoryUpdate.execute(
    { categoryId: "c1", name: "Renamed", hidden: true },
    ctx,
  ) as { name: string };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/categories/c1`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed", hidden: true });
  assertEquals(out.name, "Renamed");
});

Deno.test("category-update: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await categoryUpdate.execute({ categoryId: "c1", name: "Renamed", hidden: true }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
