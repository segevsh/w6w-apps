import { assertEquals } from "@std/assert";
import driveFolderGet from "../../actions/drive-folder-get.ts";
import { envelope, mockCtx, pathOf, PID, problem, PROBLEM_HEADERS, queryOf } from "../_helpers.ts";

Deno.test("drive-folder-get: GETs the folder with file paging", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({ id: "f1", files: [] }) }]);
  const out = await driveFolderGet.execute({ folderId: "f1", page: 2, pageSize: 5 }, ctx) as {
    id: string;
  };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/drive/folders/f1`);
  assertEquals(queryOf(calls[0].url), { page: "2", page_size: "5" });
  assertEquals(calls[0].body, null);
  assertEquals(out.id, "f1");
});

Deno.test("drive-folder-get: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await driveFolderGet.execute({ folderId: "f1", page: 2, pageSize: 5 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
