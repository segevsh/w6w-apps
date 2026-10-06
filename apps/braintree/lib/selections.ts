/**
 * GraphQL selection sets, written against the SDL (`type Transaction`, `type Refund`,
 * `type Customer`, `type PaymentMethod`). Only fields that exist on those types are selected.
 */

export const MONEY = "{ value currencyCode }";

/** A transaction in a list: no history or refund detail. */
export const TRANSACTION_SUMMARY = `
  id legacyId createdAt status amount ${MONEY} orderId merchantAccountId
  customer { id legacyId email }
  paymentMethod { id legacyId usage }
`;

/** One transaction in full: processor answer, status history and refunds. */
export const TRANSACTION_FULL = `
  id legacyId createdAt status amount ${MONEY} orderId purchaseOrderNumber channel
  merchantAccountId
  customer { id legacyId email firstName lastName }
  paymentMethod { id legacyId usage }
  processorAuthorizationResponse { legacyCode message authorizationId }
  statusHistory { status timestamp terminal amount ${MONEY} }
  refunds { id legacyId status amount ${MONEY} }
`;

export const REFUND_FIELDS = `
  id legacyId createdAt status amount ${MONEY} orderId merchantAccountId
  refundedTransaction { id legacyId status }
`;

export const CUSTOMER_FIELDS = `
  id legacyId createdAt company email firstName lastName phoneNumber fax website
  customFields { name value }
`;

export const PAYMENT_METHOD_FIELDS = `
  id legacyId usage createdAt
  customer { id legacyId }
  details {
    __typename
    ... on CreditCardDetails { brandCode last4 bin expirationMonth expirationYear cardholderName }
    ... on PayPalAccountDetails { email payerId billingAgreementId }
    ... on VenmoAccountDetails { username venmoUserId }
    ... on UsBankAccountDetails { bankName last4 accountType verified }
  }
`;
