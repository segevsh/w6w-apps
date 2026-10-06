import type { AppDefinition } from "@w6w/types";

import personalAccessToken from "./auth/personal-access-token.ts";

import userGet from "./actions/user-get.ts";
import channelList from "./actions/channel-list.ts";
import propertyList from "./actions/property-list.ts";
import propertyGet from "./actions/property-get.ts";
import propertySearch from "./actions/property-search.ts";
import propertyCalendarGet from "./actions/property-calendar-get.ts";
import propertyCalendarUpdate from "./actions/property-calendar-update.ts";
import propertyImagesList from "./actions/property-images-list.ts";
import propertyReviewsList from "./actions/property-reviews-list.ts";
import reservationList from "./actions/reservation-list.ts";
import reservationGet from "./actions/reservation-get.ts";
import reservationCreate from "./actions/reservation-create.ts";
import reservationUpdate from "./actions/reservation-update.ts";
import reservationCancel from "./actions/reservation-cancel.ts";
import reservationMessagesList from "./actions/reservation-messages-list.ts";
import reservationMessageSend from "./actions/reservation-message-send.ts";
import inquiryList from "./actions/inquiry-list.ts";
import inquiryGet from "./actions/inquiry-get.ts";
import inquiryMessageSend from "./actions/inquiry-message-send.ts";
import reviewRespond from "./actions/review-respond.ts";
import taskList from "./actions/task-list.ts";
import taskGet from "./actions/task-get.ts";
import taskCreate from "./actions/task-create.ts";
import taskUpdate from "./actions/task-update.ts";
import taskDelete from "./actions/task-delete.ts";
import teammateList from "./actions/teammate-list.ts";
import transactionList from "./actions/transaction-list.ts";
import payoutList from "./actions/payout-list.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    userGet,
    channelList,
    propertyList,
    propertyGet,
    propertySearch,
    propertyCalendarGet,
    propertyCalendarUpdate,
    propertyImagesList,
    propertyReviewsList,
    reservationList,
    reservationGet,
    reservationCreate,
    reservationUpdate,
    reservationCancel,
    reservationMessagesList,
    reservationMessageSend,
    inquiryList,
    inquiryGet,
    inquiryMessageSend,
    reviewRespond,
    taskList,
    taskGet,
    taskCreate,
    taskUpdate,
    taskDelete,
    teammateList,
    transactionList,
    payoutList,
  ],
  auth: [personalAccessToken],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
