import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import getContactImportJob from "../../actions/get-contact-import-job.ts";

// ------------------------------------------------------ get-contact-import-job

Deno.test("get-contact-import-job: GETs the job under its list", async () => {
  const { ctx, calls } = mockCtx([{ body: { Data: [{ Status: "Completed", Count: 12 }] } }]);
  await getContactImportJob.execute!({ listId: 42, jobId: 35800 }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v3/REST/contactslist/42/ManageManyContacts/35800",
  );
});

Deno.test("get-contact-import-job: surfaces a terminal Error status with its ErrorFile", async () => {
  const { ctx } = mockCtx([{
    body: { Data: [{ Status: "Error", Error: "bad row", ErrorFile: "https://example/err" }] },
  }]);
  const result = await getContactImportJob.execute!({ listId: 1, jobId: 2 }, ctx) as {
    Data: Array<{ Status: string; ErrorFile: string }>;
  };
  assertEquals(result.Data[0].Status, "Error");
  assertEquals(result.Data[0].ErrorFile, "https://example/err");
});

Deno.test("get-contact-import-job: does not fetch the ErrorFile — that host is off-allowlist", async () => {
  const { ctx, calls } = mockCtx([{
    body: { Data: [{ Status: "Error", ErrorFile: "https://example/err" }] },
  }]);
  await getContactImportJob.execute!({ listId: 1, jobId: 2 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(new URL(calls[0].url).host, "api.mailjet.com");
});
