import { assertEquals } from "@std/assert";
import { buildMessage } from "../../lib/message.ts";

Deno.test("buildMessage: maps the composition params onto Graph's message resource", () => {
  const out = buildMessage({
    to: ["a@b.com", "Carol <c@d.com>"],
    cc: ["cc@x.com"],
    bcc: ["bcc@x.com"],
    replyTo: ["reply@x.com"],
    from: "shared@x.com",
    subject: "Status",
    bodyContent: "All good",
    bodyType: "Text",
    importance: "high",
  });

  assertEquals(out.subject, "Status");
  assertEquals(out.body, { contentType: "Text", content: "All good" });
  assertEquals(out.toRecipients, [
    { emailAddress: { address: "a@b.com" } },
    { emailAddress: { address: "c@d.com", name: "Carol" } },
  ]);
  assertEquals(out.ccRecipients, [{ emailAddress: { address: "cc@x.com" } }]);
  assertEquals(out.bccRecipients, [{ emailAddress: { address: "bcc@x.com" } }]);
  assertEquals(out.replyTo, [{ emailAddress: { address: "reply@x.com" } }]);
  // `from` is a single recipient, not a collection.
  assertEquals(out.from, { emailAddress: { address: "shared@x.com" } });
  assertEquals(out.importance, "high");
});

Deno.test("buildMessage: omits every unset property rather than nulling it", () => {
  const out = buildMessage({ to: ["a@b.com"] });
  assertEquals(Object.keys(out), ["toRecipients"]);
});

Deno.test("buildMessage: tags attachments with Graph's fileAttachment type", () => {
  const out = buildMessage({
    to: ["a@b.com"],
    attachments: [
      { name: "a.txt", contentType: "text/plain", contentBytes: "SGVsbG8=" },
      { name: "b.bin", contentBytes: "AAAA" },
    ],
  });
  assertEquals(out.attachments, [
    {
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: "a.txt",
      contentType: "text/plain",
      contentBytes: "SGVsbG8=",
    },
    // contentType omitted, not sent as undefined.
    { "@odata.type": "#microsoft.graph.fileAttachment", name: "b.bin", contentBytes: "AAAA" },
  ]);
});

Deno.test("buildMessage: drops attachment rows missing a name or content", () => {
  const out = buildMessage({
    to: ["a@b.com"],
    attachments: [
      { name: "", contentBytes: "AAAA" },
      { name: "ok.txt", contentBytes: "" },
    ],
  });
  assertEquals(out.attachments, undefined);
});
