import type { ActionDefinition } from "@w6w/types";
import { encodeId, jsonObject, LoopClient } from "../lib/client.ts";

/**
 * Process Return.
 *
 * `POST /warehouse/return/{id}/process`. HTTP 200 with body `true` only means Loop QUEUED the work; confirm the result with the `return.closed` or `return.processing.failed` webhook. A synchronous refusal (e.g. the return is not in a processable state) is HTTP 200 with an `errors` body and is raised.
 */
interface Input {
  returnId: number;
  additionalDetails?: string | Record<string, unknown>;
}

const action: ActionDefinition<Input> = {
  key: "return-process",
  type: "perform",
  resource: "return",
  title: "Process Return",
  description:
    "Queue a return for processing: archive it and fulfil its remaining outcomes (exchange orders, gift cards).",
  idempotent: false,
  params: [
    {
      key: "returnId",
      label: "Return ID",
      type: "number",
      required: true,
      hint: "Loop's numeric return id (the `id` of a return from Return List / Get Return).",
      validation: { integer: true, min: 1 },
    },
    {
      key: "additionalDetails",
      label: "Additional details",
      type: "json",
      hint:
        'Optional JSON object. Loop adds these values as "Additional Details" to any exchange order and to the return timeline.',
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "True when Loop queued the processing" },
    { key: "returnId", type: "number", label: "Return ID" },
  ],

  async execute(input, ctx) {
    const extra = input.additionalDetails === undefined || input.additionalDetails === ""
      ? undefined
      : jsonObject("additionalDetails", input.additionalDetails);
    const res = await new LoopClient(ctx).post(
      `/warehouse/return/${encodeId(input.returnId)}/process`,
      extra,
    );
    return { success: res === true, returnId: input.returnId };
  },
};

export default action;
