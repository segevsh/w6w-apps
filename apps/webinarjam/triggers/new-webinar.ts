import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import webinarList from "../actions/webinar-list.ts";
import { PRODUCT_OPTIONS } from "../lib/client.ts";

/**
 * `POST /{product}/webinars` through `webinar-list`: the endpoint takes only the API key and
 * returns "a full list of all webinars published in your account" in one response (WebinarJam
 * support article, https://support.webinarjam.com/en/collections/19655423-developer-api), so the whole collection is
 * snapshot-diffed (additions only; more than 5000 webinars throws).
 */
const trigger: TriggerDefinition = {
  key: "new-webinar",
  title: "New Webinar",
  description:
    "The run gets each webinar newly published in the WebinarJam or EverWebinar account.",
  params: [{
    key: "product",
    label: "Product",
    type: "select",
    required: true,
    default: "webinarjam",
    options: PRODUCT_OPTIONS,
  }],
  output: [
    { key: "webinar_id", type: "number", label: "Webinar ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { webinar_id: 12345, webinar_hash: "abc123", name: "Product launch" },
  minIntervalMs: 300_000,
  async poll({ state, params }, ctx) {
    const product = params.product === "everwebinar" ? "everwebinar" : "webinarjam";
    const out = await webinarList.execute({ product }, ctx) as { webinars?: unknown[] };
    const rows = (out.webinars ?? []).map((value) => ({
      key: String((value as { webinar_id?: unknown }).webinar_id ?? ""),
      values: value,
    }));
    const { events, nextState } = await pollSnapshot({
      state,
      rows,
      emit: { added: true, updated: false, removed: false },
      maxRows: 5000,
    });
    return { events: events.map((event) => event.values), nextState };
  },
};

export default trigger;
