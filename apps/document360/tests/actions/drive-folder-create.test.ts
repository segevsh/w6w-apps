import { assertEquals } from "@std/assert";
import driveFolderCreate from "../../actions/drive-folder-create.ts";
import { envelope, mockCtx, pathOf, PID, problem, PROBLEM_HEADERS, queryOf } from "../_helpers.ts";

Deno.test("drive-folder-create: POSTs the folder", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: "f1", title: "Images" }) }]);
  const out = await driveFolderCreate.execute({ name: "Images", parentFolderId: "f0" }, ctx) as {
    id: string;
  };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/drive/folders`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body!), { name: "Images", parent_folder_id: "f0" });
  assertEquals(out.id, "f1");
});

Deno.test("drive-folder-create: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await driveFolderCreate.execute({ name: "Images", parentFolderId: "f0" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
