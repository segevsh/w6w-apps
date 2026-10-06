import type { ActionDefinition } from "@w6w/types";
import { BrowserlessClient, encodeId } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * `DELETE /crawl/{id}` answers 409 when the crawl is already terminal. That is the
 * crawl's state, not a failure, so it is returned as `alreadyFinished`.
 */
const crawlCancel: ActionDefinition<Input> = {
  key: "crawl-cancel",
  type: "perform",
  idempotent: true,
  resource: "crawl",
  title: "Cancel Crawl",
  description: "Cancel a running crawl. Pages already scraped stay retrievable.",
  params: [
    { key: "id", label: "Crawl id", type: "string", required: true, placeholder: "crawl_abc123" },
  ],
  output: [
    { key: "id", type: "string", label: "Crawl id" },
    { key: "status", type: "string", label: "Status after the call" },
    { key: "alreadyFinished", type: "boolean", label: "The crawl had already ended" },
    { key: "message", type: "string", label: "Vendor message, when given" },
  ],

  async execute(input, ctx) {
    const id = input.id?.trim();
    if (!id) throw new Error("Crawl id is required");
    const res = await new BrowserlessClient(ctx).response(`/crawl/${encodeId(id)}`, {
      method: "DELETE",
      accept: [409],
    });
    const text = await res.text();
    let body: Record<string, unknown> = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { message: text.slice(0, 300) };
    }
    return {
      id: (body.id as string | undefined) ?? id,
      status: (body.status as string | undefined) ?? (res.status === 409 ? undefined : "cancelled"),
      alreadyFinished: res.status === 409,
      message: body.message as string | undefined,
    };
  },
};

export default crawlCancel;
