import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  buildBody,
  compact,
  csv,
  dateText,
  emailAction,
  envelope,
  ExpensifyError,
  objectList,
  runFileJob,
  runJob,
  strArray,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";
import { sent } from "../_job.ts";

Deno.test("buildBody: one requestJobDescription field plus extras, no credentials", () => {
  const body = buildBody({ type: "get", inputSettings: { type: "policyList" } }, {
    template: "<#list>",
    skip: undefined,
    empty: "",
  });
  const form = new URLSearchParams(body);
  assertEquals([...form.keys()], ["requestJobDescription", "template"]);
  assertEquals(JSON.parse(form.get("requestJobDescription")!), {
    type: "get",
    inputSettings: { type: "policyList" },
  });
});

Deno.test("compact: drops undefined, null and empty strings but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("lists: strArray and csv accept arrays and comma/newline text", () => {
  assertEquals(strArray(" a, b\nc ,,"), ["a", "b", "c"]);
  assertEquals(strArray(["x", " y "]), ["x", "y"]);
  assertEquals(strArray(undefined), []);
  assertEquals(csv(["R1", "R2"]), "R1,R2");
  assertEquals(csv(""), undefined);
});

Deno.test("dateText: only yyyy-mm-dd passes; optional blank is undefined", () => {
  assertEquals(dateText("d", "2026-01-31"), "2026-01-31");
  assertEquals(dateText("d", ""), undefined);
  assertThrows(() => dateText("d", "16-01-01"), Error, "yyyy-mm-dd");
  assertThrows(() => dateText("d", "", true), Error, "required");
});

Deno.test("objectList: parses JSON text and rejects non-arrays and non-objects", () => {
  assertEquals(objectList("x", '[{"a":1}]'), [{ a: 1 }]);
  assertThrows(() => objectList("x", "[]"), Error, "non-empty");
  assertThrows(() => objectList("x", "{}"), Error, "non-empty");
  assertThrows(() => objectList("x", "[1]"), Error, "x[0] must be an object");
  assertThrows(() => objectList("x", "nope"), Error, "valid JSON");
});

Deno.test("envelope: reads a JSON object, nothing else", () => {
  assertEquals(envelope('{"responseCode":200}'), { responseCode: 200 });
  assertEquals(envelope("[1]"), null);
  assertEquals(envelope("<html>"), null);
});

Deno.test("emailAction: builds the onFinish email or nothing", () => {
  assertEquals(emailAction(["a@b.c", "d@e.f"], "hi"), {
    actionName: "email",
    recipients: "a@b.c,d@e.f",
    message: "hi",
  });
  assertEquals(emailAction([]), undefined);
});

Deno.test("runJob: an HTTP 200 whose responseCode is not 200 is an error carrying the vendor text", async () => {
  const { ctx } = mockCtx([{
    body: { responseMessage: "Authentication error", responseCode: 404 },
  }]);
  const err = await assertRejects(() => runJob(ctx, { type: "get" }), ExpensifyError);
  assertEquals((err as ExpensifyError).code, 404);
  assert(err.message.includes("Authentication error"));
});

Deno.test("runJob: a body that is not the envelope is an error even at HTTP 200", async () => {
  const { ctx } = mockCtx([{ body: "<html>maintenance</html>" }]);
  await assertRejects(() => runJob(ctx, { type: "get" }), ExpensifyError, "maintenance");
});

Deno.test("runJob: 207 is an error unless partialOk", async () => {
  const body = { responseCode: 207, reportIDs: ["R1"] };
  await assertRejects(() => runJob(mockCtx([{ body }]).ctx, { type: "update" }), ExpensifyError);
  const ok = await runJob(mockCtx([{ body }]).ctx, { type: "update" }, undefined, {
    partialOk: true,
  });
  assertEquals(ok.reportIDs, ["R1"]);
});

Deno.test("runFileJob: accepts a bare name, a JSON envelope name and rejects errors", async () => {
  const bare = mockCtx([{ body: "export_123.csv\n", headers: { "content-type": "text/plain" } }]);
  assertEquals(await runFileJob(bare.ctx, { type: "file" }), "export_123.csv");
  assertEquals(sent(bare.calls[0]).job.type, "file");

  const env = mockCtx([{
    body: { filename: "is_rec_1.csv", responseMessage: "OK", responseCode: 200 },
  }]);
  assertEquals(await runFileJob(env.ctx, { type: "reconciliation" }), "is_rec_1.csv");

  const bad = mockCtx([{ body: { responseMessage: "Error encountered", responseCode: 500 } }]);
  await assertRejects(
    () => runFileJob(bad.ctx, { type: "file" }),
    ExpensifyError,
    "Error encountered",
  );

  const empty = mockCtx([{ body: "", headers: { "content-type": "text/plain" } }]);
  await assertRejects(() => runFileJob(empty.ctx, { type: "file" }), ExpensifyError);
});
