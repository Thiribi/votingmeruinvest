// Shared resource types matching the expected Laravel API schema.

export type ID = string | number;

export type User = {
  id: ID;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  phone?: string | null;
  mpesa_phone?: string | null;
  avatar_url?: string | null;
  role: "fan" | "admin" | "moderator" | "organizer";
  roles?: string[];
  permissions?: string[];
  verified_at?: string | null;
  suspended_at?: string | null;
  deletion_requested_at?: string | null;
  archived_at?: string | null;
  organization_id?: ID | null;
  latitude?: number | null;
  longitude?: number | null;
  location_captured_at?: string | null;
  created_at?: string;
};

export type Permission = {
  id: ID;
  name: string;
  description?: string | null;
};

export type Role = {
  id: ID;
  name: string;
  description?: string | null;
  permissions: Permission[];
  users_count?: number;
};

export type Organization = {
  id: ID;
  name: string;
  description?: string | null;
  industry?: string | null;
  website?: string | null;
  status?: "active" | "suspended" | "closed";
  verified: boolean;
  active_campaigns?: number;
  logo_url?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_role?: string | null;
};

export type Category = {
  id: ID;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  nominees_count: number;
  status: "draft" | "live" | "closed";
  archived_at?: string | null;
  parent_id?: ID | null;
  subcategories?: Subcategory[];
};

export type Subcategory = {
  id: ID;
  category_id: ID;
  name: string;
  slug?: string;
  description?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  /** Voting "season" window — a fan can vote again once a new one starts. Null = unrestricted (vote once, ever). */
  season_starts_at?: string | null;
  season_ends_at?: string | null;
  /** When true, a new season auto-opens (same duration) as soon as the current one ends. */
  is_recurring?: boolean;
  archived_at?: string | null;
};

export type Nominee = {
  id: ID;
  name: string;
  tag?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  category_id: ID;
  subcategory_id?: ID | null;
  subcategory_slug?: string | null;
  votes_count: number;
  archived_at?: string | null;
};

export type Campaign = {
  id: ID;
  title: string;
  organization_id?: ID | null;
  organization?: Organization | null;
  category_id?: ID | null;
  category?: string | null;
  visibility: "public" | "private";
  starts_at?: string | null;
  closes_at?: string | null;
  status: "draft" | "live" | "closed";
  options?: CampaignOption[];
  feedback_options?: string[];
  invite_url?: string | null;
  invites?: { email: string; invite_url: string }[] | null;
  allowed_emails?: string[];
};

export type CampaignOption = {
  id: ID;
  label: string;
  description?: string | null;
  votes_count?: number;
  nominee?: Nominee | null;
};

export type Vote = {
  id: ID;
  campaign_id: ID;
  campaign_title?: string | null;
  option_id: ID;
  option_label?: string | null;
  voter_id?: ID | null;
  token?: string | null;
  status?: "pending_payment" | "verified" | "rejected" | "flagged";
  mpesa_reference?: string | null;
  created_at?: string;
  checkout_request_id?: string | null;
};

export type ConversationMessage = {
  id: ID;
  conversation_id: ID;
  user_id?: ID | null;
  body: string;
  author?: string | null;
  author_avatar?: string | null;
  /** True when this reply came from a platform admin — `author` is already anonymized to "FansBench Team". */
  author_is_admin?: boolean;
  created_at?: string;
};

export type Conversation = {
  id: ID;
  title: string;
  starter?: string | null;
  messages_count: number;
  last_message_at?: string | null;
  created_at?: string;
  messages?: ConversationMessage[];
};

export type VotePoint = {
  id: ID;
  latitude: number;
  longitude: number;
  campaign?: string | null;
  nominee?: string | null;
  county?: string | null;
  status?: string;
};

export type SearchResultType =
  | "category"
  | "subcategory"
  | "nominee"
  | "organization"
  | "campaign";

export type SearchResult = {
  type: SearchResultType;
  id: ID;
  title: string;
  subtitle?: string | null;
  slug?: string | null;
  category_id?: ID;
  subcategory_id?: ID | null;
  votes_count?: number;
  verified?: boolean;
  status?: string;
};

export type CartItem = {
  id: ID;
  campaign_id: ID;
  campaign?: Campaign;
  option?: CampaignOption;
};

export type Cart = {
  id: ID;
  status: "open" | "checked_out";
  fee: number;
  items: CartItem[];
};

export type CategoryBoardEntry = {
  id: ID;
  name: string;
  slug: string;
  verified_votes: number;
};

export type County = {
  id: ID;
  code: string;
  name: string;
};

export type Subcounty = {
  id: ID;
  county_id: ID;
  name: string;
};

export type Ward = {
  id: ID;
  subcounty_id: ID;
  name: string;
};

export type SavedLocation = {
  id: ID;
  label?: string | null;
  is_default: boolean;
  county_id: ID;
  county_name?: string;
  subcounty_id?: ID | null;
  subcounty_name?: string | null;
  ward_id?: ID | null;
  ward_name?: string | null;
};

export type Comment = {
  id: ID;
  post_id: ID;
  body: string;
  author?: string;
  author_avatar?: string | null;
  created_at?: string;
};

export type SmsCredential = {
  id: ID;
  label: string;
  partner_id: string;
  shortcode: string;
  is_active: boolean;
  created_at?: string;
};

export type FraudFlagVote = {
  id: ID;
  status: "pending_payment" | "verified" | "rejected" | "flagged";
  voter_phone?: string | null;
  option?: string | null;
  ip_address?: string | null;
  mpesa_reference?: string | null;
  amount?: number | string | null;
  payment_status?: string | null;
  cast_at?: string | null;
};

export type FraudFlag = {
  id: ID;
  code: string;
  reason: string;
  campaign: string;
  risk: "Low" | "Medium" | "High";
  status: "open" | "cleared" | "invalidated" | "cancelled";
  created_at: string;
  vote?: FraudFlagVote | null;
};

export type Post = {
  id: ID;
  /** "conversation" items are threads surfaced into the feed — see ConversationFeedResource. */
  type?: "post" | "conversation";
  author: string;
  author_role?: string;
  organization?: string;
  body: string;
  image_url?: string | null;
  likes: number;
  comments: number;
  liked_by_me: boolean;
  created_at: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type OtpChallenge = {
  challenge_id: string;
  expires_in: number;
};
