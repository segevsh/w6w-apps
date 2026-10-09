import type { AppDefinition } from "@w6w/types";
import personalToken from "./auth/personal-token.ts";
import oauth2 from "./auth/oauth2.ts";
import listOrganizations from "./actions/list-organizations.ts";
import listOrganizationMembers from "./actions/list-organization-members.ts";
import listOrganizationRoles from "./actions/list-organization-roles.ts";
import getUser from "./actions/get-user.ts";
import listOrganizers from "./actions/list-organizers.ts";
import getOrganizer from "./actions/get-organizer.ts";
import listEvents from "./actions/list-events.ts";
import getEvent from "./actions/get-event.ts";
import createEvent from "./actions/create-event.ts";
import updateEvent from "./actions/update-event.ts";
import publishEvent from "./actions/publish-event.ts";
import unpublishEvent from "./actions/unpublish-event.ts";
import copyEvent from "./actions/copy-event.ts";
import cancelEvent from "./actions/cancel-event.ts";
import deleteEvent from "./actions/delete-event.ts";
import getEventDescription from "./actions/get-event-description.ts";
import getEventSeries from "./actions/get-event-series.ts";
import createEventSchedule from "./actions/create-event-schedule.ts";
import getStructuredContent from "./actions/get-structured-content.ts";
import setStructuredContent from "./actions/set-structured-content.ts";
import getDisplaySettings from "./actions/get-display-settings.ts";
import updateDisplaySettings from "./actions/update-display-settings.ts";
import getTicketBuyerSettings from "./actions/get-ticket-buyer-settings.ts";
import updateTicketBuyerSettings from "./actions/update-ticket-buyer-settings.ts";
import getCapacityTier from "./actions/get-capacity-tier.ts";
import updateCapacityTier from "./actions/update-capacity-tier.ts";
import listTicketClasses from "./actions/list-ticket-classes.ts";
import getTicketClass from "./actions/get-ticket-class.ts";
import createTicketClass from "./actions/create-ticket-class.ts";
import updateTicketClass from "./actions/update-ticket-class.ts";
import getTicketGroup from "./actions/get-ticket-group.ts";
import listTicketGroups from "./actions/list-ticket-groups.ts";
import createTicketGroup from "./actions/create-ticket-group.ts";
import updateTicketGroup from "./actions/update-ticket-group.ts";
import addTicketClassToTicketGroups from "./actions/add-ticket-class-to-ticket-groups.ts";
import deleteTicketGroup from "./actions/delete-ticket-group.ts";
import getInventoryTier from "./actions/get-inventory-tier.ts";
import listInventoryTiers from "./actions/list-inventory-tiers.ts";
import createInventoryTier from "./actions/create-inventory-tier.ts";
import createMultipleInventoryTiers from "./actions/create-multiple-inventory-tiers.ts";
import updateInventoryTier from "./actions/update-inventory-tier.ts";
import updateMultipleInventoryTiers from "./actions/update-multiple-inventory-tiers.ts";
import deleteInventoryTier from "./actions/delete-inventory-tier.ts";
import getDiscount from "./actions/get-discount.ts";
import searchDiscounts from "./actions/search-discounts.ts";
import createDiscount from "./actions/create-discount.ts";
import updateDiscount from "./actions/update-discount.ts";
import deleteDiscount from "./actions/delete-discount.ts";
import listSeatMaps from "./actions/list-seat-maps.ts";
import createSeatMap from "./actions/create-seat-map.ts";
import calculateItemPrice from "./actions/calculate-item-price.ts";
import listFeeRates from "./actions/list-fee-rates.ts";
import listOrders from "./actions/list-orders.ts";
import getOrder from "./actions/get-order.ts";
import refundOrder from "./actions/refund-order.ts";
import getRefundRetentionPolicy from "./actions/get-refund-retention-policy.ts";
import listAttendees from "./actions/list-attendees.ts";
import getAttendee from "./actions/get-attendee.ts";
import getSalesReport from "./actions/get-sales-report.ts";
import getAttendeeReport from "./actions/get-attendee-report.ts";
import listEventTeams from "./actions/list-event-teams.ts";
import getEventTeam from "./actions/get-event-team.ts";
import searchEventTeams from "./actions/search-event-teams.ts";
import listTeamAttendees from "./actions/list-team-attendees.ts";
import createEventTeam from "./actions/create-event-team.ts";
import checkTeamPassword from "./actions/check-team-password.ts";
import listDefaultQuestions from "./actions/list-default-questions.ts";
import getDefaultQuestion from "./actions/get-default-question.ts";
import createDefaultQuestion from "./actions/create-default-question.ts";
import updateDefaultQuestion from "./actions/update-default-question.ts";
import deleteDefaultQuestion from "./actions/delete-default-question.ts";
import listCustomQuestions from "./actions/list-custom-questions.ts";
import getCustomQuestion from "./actions/get-custom-question.ts";
import createCustomQuestion from "./actions/create-custom-question.ts";
import deleteCustomQuestion from "./actions/delete-custom-question.ts";
import listVenues from "./actions/list-venues.ts";
import getVenue from "./actions/get-venue.ts";
import createVenue from "./actions/create-venue.ts";
import updateVenue from "./actions/update-venue.ts";
import listWebhooks from "./actions/list-webhooks.ts";
import createWebhook from "./actions/create-webhook.ts";
import deleteWebhook from "./actions/delete-webhook.ts";
import getTextOverrides from "./actions/get-text-overrides.ts";
import createTextOverrides from "./actions/create-text-overrides.ts";
import listCategories from "./actions/list-categories.ts";
import getCategory from "./actions/get-category.ts";
import listSubcategories from "./actions/list-subcategories.ts";
import getSubcategory from "./actions/get-subcategory.ts";
import listFormats from "./actions/list-formats.ts";
import getFormat from "./actions/get-format.ts";
import getMedia from "./actions/get-media.ts";
import getMediaUpload from "./actions/get-media-upload.ts";
import uploadMedia from "./actions/upload-media.ts";
import orderPlaced from "./triggers/order-placed.ts";
import orderRefunded from "./triggers/order-refunded.ts";
import orderUpdated from "./triggers/order-updated.ts";
import attendeeCheckedIn from "./triggers/attendee-checked-in.ts";
import attendeeCheckedOut from "./triggers/attendee-checked-out.ts";
import attendeeUpdated from "./triggers/attendee-updated.ts";
import eventCreated from "./triggers/event-created.ts";
import eventPublished from "./triggers/event-published.ts";
import eventUpdated from "./triggers/event-updated.ts";
import eventUnpublished from "./triggers/event-unpublished.ts";
import ticketClassCreated from "./triggers/ticket-class-created.ts";
import ticketClassUpdated from "./triggers/ticket-class-updated.ts";
import ticketClassDeleted from "./triggers/ticket-class-deleted.ts";
import organizerUpdated from "./triggers/organizer-updated.ts";
import venueUpdated from "./triggers/venue-updated.ts";
import activity from "./triggers/activity.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    listOrganizations,
    listOrganizationMembers,
    listOrganizationRoles,
    getUser,
    listOrganizers,
    getOrganizer,
    listEvents,
    getEvent,
    createEvent,
    updateEvent,
    publishEvent,
    unpublishEvent,
    copyEvent,
    cancelEvent,
    deleteEvent,
    getEventDescription,
    getEventSeries,
    createEventSchedule,
    getStructuredContent,
    setStructuredContent,
    getDisplaySettings,
    updateDisplaySettings,
    getTicketBuyerSettings,
    updateTicketBuyerSettings,
    getCapacityTier,
    updateCapacityTier,
    listTicketClasses,
    getTicketClass,
    createTicketClass,
    updateTicketClass,
    getTicketGroup,
    listTicketGroups,
    createTicketGroup,
    updateTicketGroup,
    addTicketClassToTicketGroups,
    deleteTicketGroup,
    getInventoryTier,
    listInventoryTiers,
    createInventoryTier,
    createMultipleInventoryTiers,
    updateInventoryTier,
    updateMultipleInventoryTiers,
    deleteInventoryTier,
    getDiscount,
    searchDiscounts,
    createDiscount,
    updateDiscount,
    deleteDiscount,
    listSeatMaps,
    createSeatMap,
    calculateItemPrice,
    listFeeRates,
    listOrders,
    getOrder,
    refundOrder,
    getRefundRetentionPolicy,
    listAttendees,
    getAttendee,
    getSalesReport,
    getAttendeeReport,
    listEventTeams,
    getEventTeam,
    searchEventTeams,
    listTeamAttendees,
    createEventTeam,
    checkTeamPassword,
    listDefaultQuestions,
    getDefaultQuestion,
    createDefaultQuestion,
    updateDefaultQuestion,
    deleteDefaultQuestion,
    listCustomQuestions,
    getCustomQuestion,
    createCustomQuestion,
    deleteCustomQuestion,
    listVenues,
    getVenue,
    createVenue,
    updateVenue,
    listWebhooks,
    createWebhook,
    deleteWebhook,
    getTextOverrides,
    createTextOverrides,
    listCategories,
    getCategory,
    listSubcategories,
    getSubcategory,
    listFormats,
    getFormat,
    getMedia,
    getMediaUpload,
    uploadMedia,
  ],
  triggers: [
    orderPlaced,
    orderRefunded,
    orderUpdated,
    attendeeCheckedIn,
    attendeeCheckedOut,
    attendeeUpdated,
    eventCreated,
    eventPublished,
    eventUpdated,
    eventUnpublished,
    ticketClassCreated,
    ticketClassUpdated,
    ticketClassDeleted,
    organizerUpdated,
    venueUpdated,
    activity,
  ],
  auth: [personalToken, oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
