import { assertEquals, assertRejects } from "@std/assert";
import printjobCreate from "../../actions/printjob-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("printjob-create: POST /printjobs, bare-integer answer wrapped", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 201, body: 623 }]);
  const out = await printjobCreate.execute({
    printerId: 34,
    contentType: "pdf_uri",
    content: "http://sometest.com/pdfhere",
    title: "My Test PrintJob",
    source: "api",
  }, ctx);
  assertEquals(out, { printJobId: 623 });
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/printjobs");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    printerId: 34,
    contentType: "pdf_uri",
    content: "http://sometest.com/pdfhere",
    title: "My Test PrintJob",
    source: "api",
  });
  assertEquals(logs[0].message, "print job created");
});

Deno.test("printjob-create: options map to the vendor's snake_case keys; rotate is numeric", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: 624 }]);
  await printjobCreate.execute({
    printerId: 34,
    contentType: "pdf_base64",
    content: "JVBERi0=",
    expireAfter: 600,
    qty: 2,
    copies: 2,
    collate: false,
    color: false,
    duplex: "long-edge",
    fitToPage: true,
    paper: "A4",
    bin: "Tray 1",
    pages: "1,3,5",
    rotate: "90",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.expireAfter, 600);
  assertEquals(body.qty, 2);
  assertEquals(body.options, {
    copies: 2,
    collate: false,
    color: false,
    duplex: "long-edge",
    fit_to_page: true,
    paper: "A4",
    bin: "Tray 1",
    pages: "1,3,5",
    rotate: 90,
  });
});

Deno.test("printjob-create: no options key when none are set", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: 1 }]);
  await printjobCreate.execute({ printerId: 1, contentType: "raw_base64", content: "eA==" }, ctx);
  assertEquals("options" in JSON.parse(calls[0].body!), false);
});

Deno.test("printjob-create: download authentication is built from the user/pass fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: 2 }]);
  await printjobCreate.execute({
    printerId: 1,
    contentType: "pdf_uri",
    content: "https://x/y.pdf",
    authType: "DigestAuth",
    authUser: "u",
    authPass: "p",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).authentication, {
    type: "DigestAuth",
    credentials: { user: "u", pass: "p" },
  });
});

Deno.test("printjob-create: a half-filled authentication pair is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await printjobCreate.execute({
        printerId: 1,
        contentType: "pdf_uri",
        content: "x",
        authUser: "u",
      }, ctx),
    Error,
    "both a username and a password",
  );
  assertEquals(calls.length, 0);
});

Deno.test("printjob-create: a non-integer answer is an error, not a fake id", async () => {
  const { ctx } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await assertRejects(
    async () =>
      await printjobCreate.execute({ printerId: 1, contentType: "pdf_uri", content: "x" }, ctx),
    Error,
    "did not return a print job id",
  );
});
