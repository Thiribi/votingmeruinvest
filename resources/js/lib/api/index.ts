import { apiFetch, setAuthToken, type Paginated } from "./client";
import type {
  AuthResponse,
  Campaign,
  Cart,
  Category,
  Comment,
  CategoryBoardEntry,
  County,
  FraudFlag,
  ID,
  Nominee,
  Organization,
  OtpChallenge,
  Permission,
  Post,
  Role,
  SavedLocation,
  SearchResult,
  SmsCredential,
  Subcategory,
  Subcounty,
  User,
  Vote,
  Ward,
} from "./types";

export * from "./client";
export * from "./types";

/* ---------------- Auth ---------------- */
export const authApi = {
  register: (payload: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    password: string;
    password_confirmation?: string;
  }) => apiFetch<{ challenge: OtpChallenge; user: User }>("/auth/register", { method: "POST", body: payload }),

  login: (payload: { email: string; password: string }) =>
    apiFetch<{ challenge: OtpChallenge; user: User }>("/auth/login", { method: "POST", body: payload }),

  verifyOtp: (payload: { challenge_id: string; otp: string }) =>
    apiFetch<AuthResponse>("/auth/verify-otp", { method: "POST", body: payload }).then((r) => {
      setAuthToken(r.token);
      return r;
    }),

  resendOtp: (challenge_id: string) =>
    apiFetch<OtpChallenge>("/auth/resend-otp", { method: "POST", body: { challenge_id } }),

  me: () => apiFetch<User>("/auth/me"),

  logout: async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } finally {
      setAuthToken(null);
    }
  },

  forgotPassword: (email: string) =>
    apiFetch<{ ok: true }>("/auth/forgot-password", { method: "POST", body: { email } }),

  resetPassword: (payload: { email: string; token: string; password: string; password_confirmation: string }) =>
    apiFetch<{ ok: true }>("/auth/reset-password", { method: "POST", body: payload }),

  // Omit coordinates to let the server fall back to approximate IP-based geolocation.
  saveLocation: (payload?: { latitude: number; longitude: number }) =>
    apiFetch<User>("/auth/location", { method: "POST", body: payload ?? {} }),

  updateProfile: (payload: {
    first_name?: string;
    last_name?: string;
    phone?: string | null;
    mpesa_phone?: string | null;
    avatar_url?: string | null;
  }) => apiFetch<User>("/auth/profile", { method: "PUT", body: payload }),

  requestDeletion: () => apiFetch<{ ok: true }>("/auth/request-deletion", { method: "POST" }),
};

/* ---------------- Feed / Posts ---------------- */
export const feedApi = {
  list: (query?: { page?: number; per_page?: number }) =>
    apiFetch<Paginated<Post>>("/feed", { query }),
  create: (body: { body: string; image_url?: string }) =>
    apiFetch<Post>("/feed", { method: "POST", body }),
  like: (id: Post["id"]) => apiFetch<{ likes: number }>(`/feed/${id}/like`, { method: "POST" }),
  unlike: (id: Post["id"]) => apiFetch<{ likes: number }>(`/feed/${id}/like`, { method: "DELETE" }),
};

/* ---------------- Comments ---------------- */
export const commentsApi = {
  list: (postId: Post["id"], query?: { page?: number }) =>
    apiFetch<Paginated<Comment>>(`/feed/${postId}/comments`, { query }),
  create: (postId: Post["id"], body: string) =>
    apiFetch<Comment>(`/feed/${postId}/comments`, { method: "POST", body: { body } }),
};

/* ---------------- Conversations (fan-started chat threads) ---------------- */
export const conversationsApi = {
  list: (query?: { page?: number; per_page?: number }) =>
    apiFetch<Paginated<import("./types").Conversation>>("/conversations", { query }),
  get: (id: import("./types").Conversation["id"]) =>
    apiFetch<import("./types").Conversation>(`/conversations/${id}`),
  create: (body: { body: string }) =>
    apiFetch<import("./types").Conversation>("/conversations", { method: "POST", body }),
  postMessage: (id: import("./types").Conversation["id"], body: string) =>
    apiFetch<import("./types").ConversationMessage>(`/conversations/${id}/messages`, {
      method: "POST",
      body: { body },
    }),
};

/* ---------------- Categories ---------------- */
export const categoriesApi = {
  // Pass with_archived from admin surfaces to include archived rows (server gates it on permission).
  list: (query?: { with_archived?: boolean; per_page?: number }) =>
    apiFetch<Paginated<Category>>("/categories", { query }),
  get: (idOrSlug: string | number, query?: { with_archived?: boolean }) =>
    apiFetch<Category>(`/categories/${idOrSlug}`, { query }),
  board: () => apiFetch<{ data: CategoryBoardEntry[] }>("/categories/board"),
  create: (body: Partial<Category>) => apiFetch<Category>("/categories", { method: "POST", body }),
  update: (id: Category["id"], body: Partial<Category>) =>
    apiFetch<Category>(`/categories/${id}`, { method: "PUT", body }),
  archive: (id: Category["id"]) =>
    apiFetch<Category>(`/categories/${id}/archive`, { method: "POST" }),
  unarchive: (id: Category["id"]) =>
    apiFetch<Category>(`/categories/${id}/unarchive`, { method: "POST" }),
  remove: (id: Category["id"]) => apiFetch<{ ok: true }>(`/categories/${id}`, { method: "DELETE" }),
};

/* ---------------- Subcategories ---------------- */
export const subcategoriesApi = {
  create: (categoryId: Category["id"], body: Partial<Subcategory>) =>
    apiFetch<Subcategory>(`/categories/${categoryId}/subcategories`, { method: "POST", body }),
  update: (id: Subcategory["id"], body: Partial<Subcategory>) =>
    apiFetch<Subcategory>(`/subcategories/${id}`, { method: "PUT", body }),
  archive: (id: Subcategory["id"]) =>
    apiFetch<Subcategory>(`/subcategories/${id}/archive`, { method: "POST" }),
  unarchive: (id: Subcategory["id"]) =>
    apiFetch<Subcategory>(`/subcategories/${id}/unarchive`, { method: "POST" }),
  remove: (id: Subcategory["id"]) => apiFetch<{ ok: true }>(`/subcategories/${id}`, { method: "DELETE" }),
};

/* ---------------- Nominees ---------------- */
export const nomineesApi = {
  list: (query?: {
    category_id?: string | number;
    subcategory_id?: string | number;
    page?: number;
    per_page?: number;
    with_archived?: boolean;
  }) => apiFetch<Paginated<Nominee>>("/nominees", { query }),
  get: (id: Nominee["id"]) => apiFetch<Nominee>(`/nominees/${id}`),
  leaderboard: (query?: {
    category_id?: string | number;
    subcategory_id?: string | number;
    limit?: number;
  }) => apiFetch<Nominee[]>("/nominees/leaderboard", { query }),
  trending: (query?: { limit?: number }) =>
    apiFetch<{ data: Nominee[]; window: "24h" | "all_time" }>("/nominees/trending", { query }),
  create: (subcategoryId: Subcategory["id"], body: Partial<Nominee>) =>
    apiFetch<Nominee>(`/subcategories/${subcategoryId}/nominees`, { method: "POST", body }),
  update: (id: Nominee["id"], body: Partial<Nominee>) =>
    apiFetch<Nominee>(`/nominees/${id}`, { method: "PUT", body }),
  archive: (id: Nominee["id"]) =>
    apiFetch<Nominee>(`/nominees/${id}/archive`, { method: "POST" }),
  unarchive: (id: Nominee["id"]) =>
    apiFetch<Nominee>(`/nominees/${id}/unarchive`, { method: "POST" }),
  remove: (id: Nominee["id"]) => apiFetch<{ ok: true }>(`/nominees/${id}`, { method: "DELETE" }),
  duplicate: (id: Nominee["id"], subcategoryId: Subcategory["id"]) =>
    apiFetch<Nominee>(`/nominees/${id}/duplicate`, {
      method: "POST",
      body: { subcategory_id: subcategoryId },
    }),
};

/* ---------------- Uploads ---------------- */
export const uploadsApi = {
  /** Uploads a picked file and returns its public URL, ready to save as an image_url/avatar_url. */
  image: (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return apiFetch<{ url: string }>("/uploads/images", { method: "POST", body });
  },
};

/* ---------------- Organizations ---------------- */
export const organizationsApi = {
  list: () => apiFetch<Paginated<Organization>>("/organizations"),
  get: (id: Organization["id"]) => apiFetch<Organization>(`/organizations/${id}`),
  create: (body: Partial<Organization>) =>
    apiFetch<Organization>("/organizations", { method: "POST", body }),
  update: (id: Organization["id"], body: Partial<Organization>) =>
    apiFetch<Organization>(`/organizations/${id}`, { method: "PUT", body }),
  remove: (id: Organization["id"]) =>
    apiFetch<{ ok: true }>(`/organizations/${id}`, { method: "DELETE" }),
};

/* ---------------- Campaigns ---------------- */
export const campaignsApi = {
  list: (query?: { organization_id?: string | number; status?: string; visibility?: "public" | "private" }) =>
    apiFetch<Paginated<Campaign>>("/campaigns", { query }),
  get: (id: Campaign["id"], token?: string) =>
    apiFetch<Campaign>(`/campaigns/${id}`, { query: token ? { token } : undefined }),
  create: (body: {
    title: string;
    organization_id?: string | number;
    category?: string;
    visibility: "public" | "private";
    starts_at?: string;
    closes_at?: string;
    feedback_options?: string[];
    allowed_emails?: string[];
    options: { label: string; description?: string }[];
  }) => apiFetch<Campaign>("/campaigns", { method: "POST", body }),
  feedback: (id: Campaign["id"]) =>
    apiFetch<{ data: { id: ID; feedback: string; county: string | null; created_at: string }[] }>(
      `/campaigns/${id}/feedback`,
    ),
  update: (id: Campaign["id"], body: Partial<Campaign>) =>
    apiFetch<Campaign>(`/campaigns/${id}`, { method: "PUT", body }),
  remove: (id: Campaign["id"]) => apiFetch<{ ok: true }>(`/campaigns/${id}`, { method: "DELETE" }),
  generateInvite: (id: Campaign["id"]) =>
    apiFetch<{ invite_url: string; token: string }>(`/campaigns/${id}/invite`, { method: "POST" }),
};

/* ---------------- Geography (location picker) ---------------- */
export const geographyApi = {
  counties: () => apiFetch<County[]>("/counties"),
  subcounties: (countyId: County["id"]) =>
    apiFetch<Subcounty[]>(`/counties/${countyId}/subcounties`),
  wards: (subcountyId: Subcounty["id"]) =>
    apiFetch<Ward[]>(`/subcounties/${subcountyId}/wards`),
};

/* ---------------- Voting (private/invite-token campaigns only) ---------------- */
export const votesApi = {
  cast: (payload: {
    campaign_id: Campaign["id"];
    option_id: string | number;
    token?: string;
    mpesa_phone?: string;
    latitude?: number;
    longitude?: number;
  }) => apiFetch<Vote>("/votes", { method: "POST", body: payload }),
  mine: () => apiFetch<Vote[]>("/votes/mine"),
};

/* ---------------- Guest voting (no account; phone OTP + M-Pesa) ---------------- */
export const guestVoteApi = {
  sendOtp: (phone: string, email?: string) =>
    apiFetch<{ challenge_id: string; expires_in: number }>("/guest/vote/otp", {
      method: "POST",
      body: { phone, email: email || undefined },
    }),
  cast: (payload: {
    challenge_id: string;
    otp: string;
    campaign_id: Campaign["id"];
    option_id: string | number;
    mpesa_phone: string;
    latitude?: number;
    longitude?: number;
  }) => apiFetch<{ transaction_id: number }>("/guest/vote", { method: "POST", body: payload }),
  status: (transactionId: number, phone: string) =>
    apiFetch<{ status: "pending" | "confirmed" | "failed" }>("/guest/vote/status", {
      query: { transaction_id: transactionId, phone },
    }),
  submitFeedback: (payload: { transaction_id: number; phone: string; feedback: string }) =>
    apiFetch<{ ok: true }>("/guest/vote/feedback", { method: "POST", body: payload }),
};

/* ---------------- Cart (public/logged-in citizen voting) ---------------- */
export const cartApi = {
  get: () => apiFetch<Cart>("/cart"),
  addItem: (payload: { campaign_id: Campaign["id"]; option_id: string | number }) =>
    apiFetch<Cart>("/cart/items", { method: "POST", body: payload }),
  removeItem: (itemId: Cart["items"][number]["id"]) =>
    apiFetch<Cart>(`/cart/items/${itemId}`, { method: "DELETE" }),
  checkout: (payload: {
    mpesa_phone?: string;
    latitude?: number;
    longitude?: number;
  }) =>
    apiFetch<{ transaction_id: number | null; votes: Vote[] }>("/cart/checkout", {
      method: "POST",
      body: payload,
    }),
  verifyCheckout: (transactionId: number) =>
    apiFetch<{ status: "pending" | "confirmed" | "failed"; votes: Vote[] }>(
      "/cart/checkout/verify",
      { query: { transaction_id: transactionId } },
    ),
  submitFeedback: (payload: { transaction_id: number; feedback: string }) =>
    apiFetch<{ ok: true }>("/cart/feedback", { method: "POST", body: payload }),
};

/* ---------------- Saved locations (logged-in citizens) ---------------- */
export const savedLocationsApi = {
  list: () => apiFetch<SavedLocation[]>("/saved-locations"),
  create: (body: {
    label?: string;
    county_id: County["id"];
    subcounty_id?: Subcounty["id"];
    ward_id?: Ward["id"];
    is_default?: boolean;
  }) => apiFetch<SavedLocation>("/saved-locations", { method: "POST", body }),
  update: (id: SavedLocation["id"], body: Partial<SavedLocation>) =>
    apiFetch<SavedLocation>(`/saved-locations/${id}`, { method: "PUT", body }),
  remove: (id: SavedLocation["id"]) =>
    apiFetch<{ ok: true }>(`/saved-locations/${id}`, { method: "DELETE" }),
};

/* ---------------- Admin ---------------- */
export const adminApi = {
  stats: () =>
    apiFetch<{
      verified_voters: number;
      votes_24h: number;
      open_fraud_flags: number;
      active_campaigns: number;
      mpesa_reconciliation_pct: number | null;
      otp_delivery_pct: number | null;
      fraud_sla_pct: number | null;
      revenue_30d: number;
      votes_30d: number;
      pending_transactions: number;
      total_fans: number;
    }>("/admin/stats"),

  statsSeries: (query?: { days?: number }) =>
    apiFetch<{ data: { date: string; votes: number; revenue: number }[] }>("/admin/stats/series", { query }),

  statsOrganizations: () =>
    apiFetch<{
      data: {
        id: ID;
        name: string;
        logo_url: string | null;
        campaigns_count: number;
        votes: number;
        revenue: number;
      }[];
    }>("/admin/stats/organizations"),

  transactions: (query?: { limit?: number }) =>
    apiFetch<{
      data: {
        id: ID;
        payer: string;
        phone_number: string | null;
        amount: number;
        status: string;
        provider_reference: string | null;
        created_at: string | null;
      }[];
    }>("/admin/transactions", { query }),

  auditLogs: (query?: { page?: number; per_page?: number }) =>
    apiFetch<Paginated<{ id: ID; action: string; description: string; actor_name: string; created_at: string }>>(
      "/admin/audit-logs",
      { query },
    ),

  reports: {
    votes: (query?: { from?: string; to?: string; page?: number; per_page?: number }) =>
      apiFetch<
        Paginated<{
          id: ID;
          date: string | null;
          status: string;
          campaign: string | null;
          nominee: string | null;
          voter_name: string | null;
          voter_email: string | null;
          voter_phone: string | null;
          guest_phone: string | null;
          mpesa_reference: string | null;
          amount: number | null;
          county: string | null;
          latitude: number | null;
          longitude: number | null;
          ip_address: string | null;
          feedback: string | null;
        }>
      >("/admin/reports/votes", { query }),
    revenue: (query?: { from?: string; to?: string; page?: number; per_page?: number }) =>
      apiFetch<
        Paginated<{
          id: ID;
          date: string | null;
          status: string;
          payer_name: string | null;
          payer_email: string | null;
          phone_number: string | null;
          amount: number | null;
          provider: string | null;
          provider_reference: string | null;
        }>
      >("/admin/reports/revenue", { query }),
  },

  users: {
    list: (query?: {
      search?: string;
      role?: string;
      classification?: "fan" | "staff";
      page?: number;
      with_archived?: boolean;
      archived?: boolean;
      pending_deletion?: boolean;
    }) => apiFetch<Paginated<User>>("/admin/users", { query }),
    update: (id: User["id"], body: Partial<User> & { permissions?: string[] }) =>
      apiFetch<User>(`/admin/users/${id}`, { method: "PUT", body }),
    setRole: (id: User["id"], role: User["role"]) =>
      apiFetch<User>(`/admin/users/${id}/role`, { method: "POST", body: { role } }),
    setPermissions: (id: User["id"], permissions: string[]) =>
      apiFetch<User>(`/admin/users/${id}/permissions`, { method: "POST", body: { permissions } }),
    setRoles: (id: User["id"], roles: string[]) =>
      apiFetch<User>(`/admin/users/${id}/roles`, { method: "POST", body: { roles } }),
    invite: (body: { first_name: string; last_name: string; email: string; role: User["role"] }) =>
      apiFetch<User>("/admin/users", { method: "POST", body }),
    remove: (id: User["id"]) => apiFetch<{ ok: true }>(`/admin/users/${id}`, { method: "DELETE" }),
    suspend: (id: User["id"]) => apiFetch<User>(`/admin/users/${id}/suspend`, { method: "POST" }),
    activate: (id: User["id"]) => apiFetch<User>(`/admin/users/${id}/activate`, { method: "POST" }),
    resetPassword: (id: User["id"]) =>
      apiFetch<{ ok: true }>(`/admin/users/${id}/reset-password`, { method: "POST" }),
    archive: (id: User["id"]) => apiFetch<User>(`/admin/users/${id}/archive`, { method: "POST" }),
    unarchive: (id: User["id"]) => apiFetch<User>(`/admin/users/${id}/unarchive`, { method: "POST" }),
    dismissDeletionRequest: (id: User["id"]) =>
      apiFetch<User>(`/admin/users/${id}/dismiss-deletion-request`, { method: "POST" }),
  },

  roles: {
    list: () => apiFetch<Role[]>("/admin/roles"),
    create: (body: { name: string; description?: string; permissions: string[] }) =>
      apiFetch<Role>("/admin/roles", { method: "POST", body }),
    update: (id: Role["id"], body: Partial<{ name: string; description: string; permissions: string[] }>) =>
      apiFetch<Role>(`/admin/roles/${id}`, { method: "PUT", body }),
    remove: (id: Role["id"]) => apiFetch<{ ok: true }>(`/admin/roles/${id}`, { method: "DELETE" }),
  },

  permissions: {
    list: () => apiFetch<Permission[]>("/admin/permissions"),
  },

  votesMap: (query?: { category_id?: string | number; organization_id?: string | number }) =>
    apiFetch<{ data: import("./types").VotePoint[] }>("/admin/votes/map", { query }),

  fraud: {
    list: (query?: { status?: string }) =>
      apiFetch<Paginated<FraudFlag>>("/admin/fraud", { query }),
    clear: (id: FraudFlag["id"]) =>
      apiFetch<FraudFlag>(`/admin/fraud/${id}/clear`, { method: "POST" }),
    invalidate: (id: FraudFlag["id"]) =>
      apiFetch<FraudFlag>(`/admin/fraud/${id}/invalidate`, { method: "POST" }),
    cancel: (id: FraudFlag["id"]) =>
      apiFetch<FraudFlag>(`/admin/fraud/${id}/cancel`, { method: "POST" }),
    stats: () =>
      apiFetch<{ resolved_today: number; avg_review_seconds: number }>("/admin/fraud/stats"),
  },

  settings: {
    get: () =>
      apiFetch<{
        platform_name: string;
        support_email: string;
        require_dual_otp: boolean;
        mpesa_enabled: boolean;
        mpesa_shortcode?: string;
        fraud_auto_review: boolean;
        max_votes_per_ip: number;
      }>("/admin/settings"),
    update: (body: Record<string, unknown>) =>
      apiFetch<{ ok: true }>("/admin/settings", { method: "PUT", body }),
  },

  smsCredentials: {
    list: () => apiFetch<SmsCredential[]>("/admin/sms-credentials"),
    create: (body: { label: string; partner_id: string; api_key: string; shortcode: string }) =>
      apiFetch<SmsCredential>("/admin/sms-credentials", { method: "POST", body }),
    update: (
      id: SmsCredential["id"],
      body: Partial<{ label: string; partner_id: string; api_key: string; shortcode: string }>,
    ) => apiFetch<SmsCredential>(`/admin/sms-credentials/${id}`, { method: "PUT", body }),
    remove: (id: SmsCredential["id"]) =>
      apiFetch<{ ok: true }>(`/admin/sms-credentials/${id}`, { method: "DELETE" }),
    activate: (id: SmsCredential["id"]) =>
      apiFetch<SmsCredential>(`/admin/sms-credentials/${id}/activate`, { method: "POST" }),
    deactivate: (id: SmsCredential["id"]) =>
      apiFetch<SmsCredential>(`/admin/sms-credentials/${id}/deactivate`, { method: "POST" }),
  },
};

/* ---------------- Contact ---------------- */
export const contactApi = {
  send: (payload: { name: string; email: string; message: string }) =>
    apiFetch<{ ok: true }>("/contact", { method: "POST", body: payload }),
};

/* ---------------- Public stats (landing page) ---------------- */
export const statsApi = {
  public: () =>
    apiFetch<{
      verified_voters: number;
      active_campaigns: number;
      organizations: number;
      verification_fee: number;
    }>("/stats"),
};

/* ---------------- Universal search ---------------- */
export const searchApi = {
  query: (q: string) =>
    apiFetch<{ query: string; results: SearchResult[] }>("/search", { query: { q } }),
};
