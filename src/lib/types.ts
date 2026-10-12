export const PLATFORM_IDS = [
  "weibo",
  "wechat_oa",
  "xiaohongshu",
  "x",
  "facebook",
  "instagram",
] as const;

export type PlatformId = (typeof PLATFORM_IDS)[number];

export type Region = "cn" | "global";

export type AccountStatus = "connected" | "disconnected" | "error";

export type BindMethod = "oauth" | "manual" | "env";

export type AccountCredentials = Record<string, string>;

export type VariantStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed";

export type ScheduleMode = "immediate" | "next_peak" | "custom";

export type LeadStatus = "new" | "contacted" | "won" | "lost";

export type LeadSource = PlatformId | "landing" | "manual";

export type LlmProviderId =
  | "openai"
  | "deepseek"
  | "tongyi"
  | "moonshot"
  | "zhipu"
  | "ollama"
  | "custom";

export interface PlatformSpec {
  id: PlatformId;
  name: string;
  englishName: string;
  region: Region;
  preferredChars: { min: number; max: number; hard: number };
  format: string;
  extras: string[];
  color: string;
  needsImage: boolean;
}

export interface Account {
  id: string;
  platform: PlatformId;
  displayName: string;
  status: AccountStatus;
  hint: string;
  updatedAt: string;
  credentials: AccountCredentials;
  bindMethod: BindMethod | null;
  boundAt: string | null;
  profileUrl: string | null;
}

export interface CanonicalPost {
  id: string;
  title: string;
  body: string;
  tags: string[];
  coverImage: string;
  originalStatement: boolean;
  campaignId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformContent {
  title?: string;
  text: string;
  html?: string;
  digest?: string;
  tags: string[];
  coverImage?: string;
  topics?: string[];
  warnings: string[];
  charCount: number;
}

export interface PostVariant {
  id: string;
  postId: string;
  platform: PlatformId;
  accountId: string | null;
  content: PlatformContent;
  status: VariantStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  remoteId: string | null;
  remoteUrl: string | null;
  error: string | null;
}

export interface PublishResult {
  ok: boolean;
  dryRun: boolean;
  remoteId?: string;
  url?: string;
  message: string;
}

export interface LlmConfig {
  provider: LlmProviderId;
  baseUrl: string;
  apiKey: string;
  chatModel: string;
  imageModel: string;
}

export interface AppSettings {
  timezone: string;
  dryRun: boolean;
  staggerMinutes: number;
  avoidExactHour: boolean;
  enabledPeaks: string[];
  llm: LlmConfig;
}

export interface Campaign {
  id: string;
  name: string;
  slug: string;
  goal: string;
  keyword: string;
  wechat: string;
  offer: string;
  cta: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  campaignId: string | null;
  name: string;
  contact: string;
  source: LeadSource;
  note: string;
  status: LeadStatus;
  createdAt: string;
}

export interface OAuthChoice {
  id: string;
  name: string;
  token: string;
  username?: string;
}

export interface OAuthPending {
  state: string;
  platform: PlatformId;
  verifier?: string;
  createdAt: string;
  choices?: OAuthChoice[];
  hint?: string;
}

export type UserRole = "super_admin" | "tenant_admin" | "operator" | "viewer";

export type TenantPlan = "starter" | "pro" | "agency";

export type TenantStatus = "active" | "paused";

export type KolStatus = "prospect" | "cooperating" | "paused" | "ended";

export type KolDealStatus = "talking" | "confirmed" | "producing" | "published" | "settled" | "cancelled";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  status: TenantStatus;
  contactName: string;
  contactWechat: string;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface KolChannel {
  platform: string;
  handle: string;
  followers: number;
}

export interface Kol {
  id: string;
  name: string;
  platforms: KolChannel[];
  category: string;
  city: string;
  contact: string;
  wechat: string;
  quotePrice: number | null;
  status: KolStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface KolDeal {
  id: string;
  kolId: string;
  title: string;
  fee: number | null;
  startAt: string | null;
  endAt: string | null;
  deliverable: string;
  resultUrl: string;
  status: KolDealStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  tenantId: string | null;
  userId: string | null;
  action: string;
  target: string;
  detail: Record<string, unknown>;
  createdAt: string;
}

export interface Store {
  settings: AppSettings;
  accounts: Account[];
  posts: CanonicalPost[];
  variants: PostVariant[];
  oauthPending: OAuthPending | null;
  campaigns: Campaign[];
  leads: Lead[];
}

export interface PeakWindow {
  id: string;
  label: string;
  hint: string;
  start: string;
  end: string;
  weight: number;
}

export interface SuggestedSlot {
  platform: PlatformId;
  at: string;
  windowId: string;
  windowLabel: string;
}
