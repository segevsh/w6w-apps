/**
 * Workiz's response records, in the vendor's own field names.
 *
 * `Lead` and `Job` are deliberately typed loosely — almost every field is an
 * optional string in the vendor's schema (numbers only where the spec says
 * `int`) — because Workiz does not guarantee which fields come back on any
 * given record. The names and casing are literal; the API mixes PascalCase with
 * `item_cost`/`tech_cost`, and normalising that would describe a shape the
 * vendor never sends.
 */

/** `GET /team/all/` and `GET /team/get/{USER_ID}`. */
export interface TeamMember {
  active?: boolean;
  created?: string;
  email?: string;
  fieldTech?: boolean;
  id?: string;
  name?: string;
  role?: string;
  serviceAreas?: string[];
  skills?: string[];
}

/** `GET /TimeOff/get/` and `GET /TimeOff/get/{USER_NAME}`. */
export interface TimeOff {
  start?: string;
  end?: string;
  userName?: string;
}

/** `{id, name}` — a team member reference embedded in a lead or job. */
export interface TeamRef {
  id?: string;
  name?: string;
}

/** `GET /lead/get/{UUID}/` and the rows of `GET /lead/all/`. */
export interface Lead {
  Address?: string;
  City?: string;
  ClientId?: number;
  Comments?: string;
  Company?: string;
  Country?: string;
  CreatedDate?: string;
  Email?: string;
  FirstName?: string;
  JobSource?: string;
  JobType?: string;
  LastName?: string;
  Latitude?: string;
  Longitude?: string;
  PaymentDueDate?: string;
  Phone?: string;
  PhoneExt?: string;
  PostalCode?: string;
  ReferralCompany?: string;
  SecondPhone?: string;
  SecondPhoneExt?: string;
  SerialId?: number;
  State?: string;
  Status?: string;
  SubStatus?: string;
  Team?: TeamRef[];
  Timezone?: string;
  UUID?: string;
  Unit?: string;
  LeadDateTime?: string;
  LeadEndDateTime?: string;
  LeadNotes?: string;
}

/** `GET /job/get/{UUID}/` and the rows of `GET /job/all/`. */
export interface Job {
  Address?: string;
  City?: string;
  ClientId?: number;
  Comments?: string;
  Company?: string;
  Country?: string;
  CreatedBy?: string;
  CreatedDate?: string;
  Email?: string;
  FirstName?: string;
  JobAmountDue?: string;
  JobDateTime?: string;
  JobEndDateTime?: string;
  JobNotes?: string;
  JobSource?: string;
  JobTotalPrice?: string;
  JobType?: string;
  LastName?: string;
  LastStatusUpdate?: string;
  Latitude?: string;
  Longitude?: string;
  PaymentDueDate?: string;
  Phone?: string;
  PhoneExt?: string;
  PostalCode?: string;
  ReferralCompany?: string;
  SecondPhone?: string;
  SecondPhoneExt?: string;
  SerialId?: number;
  ServiceArea?: string;
  State?: string;
  Status?: string;
  SubStatus?: string;
  SubTotal?: string;
  Tags?: string[];
  Team?: TeamRef[];
  Timezone?: string;
  UUID?: string;
  Unit?: string;
  item_cost?: string;
  tech_cost?: string;
}

/** One identity entry inside a write acknowledgement's `data` array. */
export interface RecordRef {
  UUID?: string;
  ClientId?: number | string;
  link?: string;
}

/** `{flag, data: [{UUID, ClientId, link}]}` — every lead/job write's envelope. */
export interface WriteAck {
  flag?: boolean;
  data?: RecordRef[];
}

/** `POST /lead/assign/` and `/lead/unassign/` answer a bare array of these. */
export interface LeadLink {
  LeadId?: string;
  UUID?: string;
  link?: string;
}

/** `POST /lead/convert/` answers the identity of the job it created. */
export interface ConvertResult {
  ClientId?: string;
  UUID?: string;
  link?: string;
}

/** `POST /lead/markLost/{UUID}/` and `/lead/activate/{UUID}/`. */
export interface StatusAck {
  code?: string;
  flag?: boolean;
  msg?: string;
}

/** `POST /job/addPayment/{UUID}/` answers `{flag, msg, data: {paymentId}}`. */
export interface PaymentAck {
  flag?: boolean;
  msg?: string;
  data?: { paymentId?: number };
}
