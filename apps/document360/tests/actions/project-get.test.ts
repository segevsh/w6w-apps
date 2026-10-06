import { assertEquals } from "@std/assert";
import projectGet from "../../actions/project-get.ts";
import { envelope, mockCtx, pathOf, PID, problem, PROBLEM_HEADERS, queryOf } from "../_helpers.ts";

Deno.test("project-get: GETs the project", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: envelope({ id: PID, name: "Docs", status: 0 }),
  }]);
  const out = await projectGet.execute({}, ctx) as { name: string };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out.name, "Docs");
});

Deno.test("project-get: an explicit projectId wins over the Connection's", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({ id: "x" }) }]);
  const out = await projectGet.execute({ projectId: "other/id" }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v3/projects/other%2Fid");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(typeof out, "object");
});

Deno.test("project-get: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await projectGet.execute({}, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
