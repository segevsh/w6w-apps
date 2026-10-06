import type { ActionDefinition } from "@w6w/types";
import { compact, PodiumClient } from "../lib/client.ts";

interface Input {
  locationUid: string;
  email?: string;
  phoneNumber?: string;
}

const reviewInviteCreate: ActionDefinition<Input> = {
  key: "review-invite-create",
  type: "perform",
  resource: "review-invite",
  title: "Create Review Invite Link",
  description:
    "Create a review invitation link for a contact. Podium: never reuse a link across contacts \u2014 create a fresh one per contact. Requires scope `write_reviews`.",
  idempotent: false,
  params: [{
    key: "locationUid",
    label: "Location UID",
    type: "string",
    required: true,
  }, {
    key: "email",
    label: "Email",
    type: "string",
  }, {
    key: "phoneNumber",
    label: "Phone number",
    type: "string",
    hint: "E.164.",
  }],
  output: [{
    key: "attributions",
    type: "array",
    label: "attributions",
  }, {
    key: "channel",
    type: "object",
    label: "Channel the review invite was sent through",
  }, {
    key: "conversationItemUid",
    type: "string",
    label: "Podium unique identifier for conversation item",
  }, {
    key: "createdAt",
    type: "string",
    label: "When the review invite was created",
  }, {
    key: "customerName",
    type: "string",
    label: "The name of the customer that the review invite was sent to",
  }, {
    key: "deliveryStatus",
    type: "string",
    label: "Delivery status of the review invite",
  }, {
    key: "languages",
    type: "array",
    label: "languages",
  }, {
    key: "linkClicked",
    type: "boolean",
    label: "Whether or not the review invite link has been clicked",
  }, {
    key: "linkClickedAt",
    type: "string",
    label: "When the review invite link was clicked",
  }, {
    key: "location",
    type: "object",
    label: "Location that the review invite was created on behalf of",
  }, {
    key: "sender",
    type: "object",
    label: "Podium user who sent the review invite",
  }, {
    key: "shortUrl",
    type: "string",
    label: "Short form url to view the review invite in Podium",
  }, {
    key: "test",
    type: "boolean",
    label: "Whether or not the review invite was a test",
  }, {
    key: "uid",
    type: "string",
    label: "Podium unique identifier for review invite",
  }, {
    key: "updatedAt",
    type: "string",
    label: "When the review invite was updated",
  }, {
    key: "url",
    type: "string",
    label: "Url to view the review invite in Podium",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).one("/reviews/invites", {
      method: "POST",
      body: compact({
        locationUid: input.locationUid,
        email: input.email,
        phoneNumber: input.phoneNumber,
      }),
    });
  },
};

export default reviewInviteCreate;
