import appointmentList from "../actions/appointment-list.ts";
import callList from "../actions/call-list.ts";
import campaignList from "../actions/campaign-list.ts";
import contactAttributeList from "../actions/contact-attribute-list.ts";
import contactList from "../actions/contact-list.ts";
import contactTagList from "../actions/contact-tag-list.ts";
import feedbackList from "../actions/feedback-list.ts";
import locationList from "../actions/location-list.ts";
import messageList from "../actions/message-list.ts";
import reviewInviteList from "../actions/review-invite-list.ts";
import reviewList from "../actions/review-list.ts";
import reviewSummaryList from "../actions/review-summary-list.ts";
import templateList from "../actions/template-list.ts";
import userList from "../actions/user-list.ts";
import webhookList from "../actions/webhook-list.ts";
import { recordTrigger } from "../lib/triggers.ts";

const rows = (result: unknown) => (result as { items?: unknown[] }).items ?? [];

export const newAppointment = recordTrigger({
  key: "new-appointment",
  title: "Appointment",
  action: appointmentList,
  items: rows,
});
export const newCall = recordTrigger({
  key: "new-call",
  title: "Call",
  action: callList,
  items: rows,
});
export const newCampaign = recordTrigger({
  key: "new-campaign",
  title: "Campaign",
  action: campaignList,
  items: rows,
});
export const newContactAttribute = recordTrigger({
  key: "new-contact-attribute",
  title: "Contact Attribute",
  action: contactAttributeList,
  items: rows,
});
export const newContact = recordTrigger({
  key: "new-contact",
  title: "Contact",
  action: contactList,
  items: rows,
});
export const newContactTag = recordTrigger({
  key: "new-contact-tag",
  title: "Contact Tag",
  action: contactTagList,
  items: rows,
});
export const newFeedback = recordTrigger({
  key: "new-feedback",
  title: "Feedback",
  action: feedbackList,
  items: rows,
});
export const newLocation = recordTrigger({
  key: "new-location",
  title: "Location",
  action: locationList,
  items: rows,
});
export const newMessage = recordTrigger({
  key: "new-message",
  title: "Message",
  action: messageList,
  items: rows,
});
export const newReviewInvite = recordTrigger({
  key: "new-review-invite",
  title: "Review Invite",
  action: reviewInviteList,
  items: rows,
});
export const newReview = recordTrigger({
  key: "new-review",
  title: "Review",
  action: reviewList,
  items: rows,
});
export const newReviewSummary = recordTrigger({
  key: "new-review-summary",
  title: "Review Summary",
  action: reviewSummaryList,
  items: rows,
});
export const newTemplate = recordTrigger({
  key: "new-template",
  title: "Template",
  action: templateList,
  items: rows,
});
export const newUser = recordTrigger({
  key: "new-user",
  title: "User",
  action: userList,
  items: rows,
});
export const newWebhook = recordTrigger({
  key: "new-webhook",
  title: "Webhook",
  action: webhookList,
  items: rows,
});
