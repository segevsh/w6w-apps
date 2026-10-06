import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/table-render.ts";
import { exec, IMG_HEADERS, mockCtx, PNG } from "../_helpers.ts";

const DATA = {
  columns: [{ title: "Name", dataIndex: "name" }],
  dataSource: [{ name: "Ada" }, "-"],
};

Deno.test("table-render: parses JSON text params and POSTs /v1/table", async () => {
  const { ctx, calls, created } = mockCtx([{ headers: IMG_HEADERS, body: PNG }], { files: true });
  const out = await exec(action, { data: JSON.stringify(DATA), options: '{"cellWidth":120}' }, ctx);
  assertEquals(calls[0].url, "https://quickchart.io/v1/table");
  assertEquals(JSON.parse(calls[0].body!), { data: DATA, options: { cellWidth: 120 } });
  assertEquals(created[0].filename, "table.png");
  assertEquals(out.contentType, "image/png");
});

Deno.test("table-render: objects pass through; invalid JSON text is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([{ headers: IMG_HEADERS, body: PNG }]);
  await exec(action, { data: DATA }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { data: DATA });
  const none = mockCtx();
  await assertRejects(
    () => exec(action, { data: "{nope" }, none.ctx),
    Error,
    "data must be valid JSON",
  );
  assertEquals(none.calls.length, 0);
});
