/**
 * Este arquivo é um ESQUELETO manual.
 * Assim que o schema.sql estiver aplicado no projeto Supabase, gere o tipo
 * real e definitivo com:
 *
 *   pnpm dlx supabase gen types typescript --project-id SEU_PROJETO_REF > types/database.types.ts
 *
 * Mantenha isso em um script `pnpm db:types` e rode sempre após migrations.
 */

export type PostVisibility = "public" | "followers" | "subscribers" | "private";
export type WalletTxType =
  | "credit_purchase"
  | "tip_sent"
  | "tip_received"
  | "creator_payout"
  | "refund"
  | "subscription_reward";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "incomplete";
export type FeedAlgoMode = "chronological" | "balanced" | "discovery";

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  is_creator: boolean;
  premium_tier: "free" | "pro" | "creator_plus";
  feed_algo_mode: FeedAlgoMode;
  followers_count: number;
  following_count: number;
  posts_count: number;
  created_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  content: string | null;
  media_urls: string[];
  visibility: PostVisibility;
  is_premium_content: boolean;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  created_at: string;
}

export interface Wallet {
  user_id: string;
  balance: number;
  updated_at: string;
}

// Placeholder mínimo — a interface `Database` completa vem do `supabase gen types`.
export type Database = {
  public: {
    Tables: Record<string, { Row: Record<string, unknown> }>;
  };
};
