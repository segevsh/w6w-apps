import { assertEquals } from "@std/assert";
import driveFileGet from "../../actions/drive-file-get.ts";
import { envelope, mockCtx, pathOf, PID, problem, PROBLEM_HEADERS, queryOf } from "../_helpers.ts";

Deno.test("drive-file-get: GETs the file under its folder", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: envelope({ id: "x1", file_name: "a.png" }),
  }]);
  const out = await driveFileGet.execute({ folderId: "f1", fileId: "x1" }, ctx) as {
    file_name: string;
  };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/drive/folders/f1/files/x1`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out.file_name, "a.png");
});

Deno.test("drive-file-get: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await driveFileGet.execute({ folderId: "f1", fileId: "x1" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
