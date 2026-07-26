import type { ActionDefinition } from "@w6w/types";
import { type SendCommon, sendCommonBody, TelegramClient } from "../lib/client.ts";
import { chatId, deliveryOptions, messageOutput } from "../lib/params.ts";

interface Input extends SendCommon {
  latitude: number;
  longitude: number;
  horizontalAccuracy?: number;
  livePeriod?: number;
}

const messageSendLocation: ActionDefinition<Input> = {
  key: "message-send-location",
  type: "perform",
  resource: "message",
  title: "Send Location",
  description: "Send a point on the map to a chat.",
  idempotent: false,
  params: [
    chatId,
    {
      key: "latitude",
      label: "Latitude",
      type: "number",
      required: true,
      validation: { min: -90, max: 90 },
    },
    {
      key: "longitude",
      label: "Longitude",
      type: "number",
      required: true,
      validation: { min: -180, max: 180 },
    },
    {
      key: "horizontalAccuracy",
      label: "Accuracy (metres)",
      type: "number",
      validation: { min: 0, max: 1500 },
    },
    {
      key: "livePeriod",
      label: "Live period (seconds)",
      type: "number",
      hint: "60-86400 turns this into a live location that keeps updating.",
      validation: { min: 60, max: 86400 },
    },
    deliveryOptions,
  ],
  output: messageOutput,

  execute(input, ctx) {
    return new TelegramClient(ctx).call("sendLocation", {
      body: {
        ...sendCommonBody(input),
        latitude: input.latitude,
        longitude: input.longitude,
        horizontal_accuracy: input.horizontalAccuracy,
        live_period: input.livePeriod,
      },
    });
  },
};

export default messageSendLocation;
