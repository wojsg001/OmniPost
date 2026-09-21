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

export interface OAuthPending {
  state: string;
  platform: PlatformId;
  verifier?: string;
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
