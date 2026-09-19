"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Repeat2, Coins, BadgeCheck, MoreHorizontal, Trash2, Lock } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/primitives";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toggleLike, deletePost } from "@/actions/posts";
import { TipDialog } from "@/components/feed/tip-dialog";
import { CommentDialog } from "@/components/feed/comment-dialog";
import { toast } from "sonner";
import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface FeedPost {
  id: string;
  content: string | null;
  media_urls: string[];
  visibility: "public" | "followers" | "subscribers" | "private";
  created_at: string;
  likes_count: number;
  comments_count: number;
  author_id: string;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
    is_creator: boolean;
  };
}

export function PostCard({
  post,
  isLiked,
  currentUserId,
  onToggleLike,
}: {
  post: FeedPost;
  isLiked: boolean;
  currentUserId: string;
  onToggleLike: (postId: string, nowLiked: boolean) => void;
}) {
  const [liked, setLiked] = useState(isLiked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [tipOpen, setTipOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [, startTransition] = useTransition();

  function handleLike() {
    const nextLiked = !liked;

    // Otimista: UI muda na hora, servidor confirma depois.
    setLiked(nextLiked);
    setLikesCount((c) => c + (nextLiked ? 1 : -1));
    onToggleLike(post.id, nextLiked);

    startTransition(async () => {
      try {
        await toggleLike(post.id, liked);
      } catch {
        // rollback em caso de falha (RLS, rede etc.)
        setLiked(liked);
        setLikesCount((c) => c + (nextLiked ? -1 : 1));
        onToggleLike(post.id, liked);
        toast.error("Não foi possível curtir. Tente de novo.");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deletePost(post.id);
        setDeleted(true);
        toast.success("Post apagado.");
      } catch {
        toast.error("Não foi possível apagar o post.");
      }
    });
  }

  const isOwnPost = post.author_id === currentUserId;

  if (deleted) return null;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-border bg-card p-3.5 sm:p-[18px]"
    >
      <div className="flex items-start gap-2.5">
        <Avatar name={post.author.display_name} src={post.author.avatar_url} size={42} />
        <div className="flex flex-1 min-w-0 flex-col leading-tight">
          <div className="flex items-center gap-1.5 text-[14.5px] font-semibold flex-wrap">
            <Link href={`/perfil/${post.author.username}`} className="hover:underline truncate max-w-[55vw] sm:max-w-none">
              {post.author.display_name}
            </Link>
            {post.author.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-live flex-shrink-0" />}
            {post.author.is_creator && <Badge variant="signal">Criador</Badge>}
            {post.visibility === "subscribers" && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Lock className="h-3 w-3" /> assinantes
              </span>
            )}
          </div>
          <span className="text-[12.5px] text-muted-foreground">
            @{post.author.username} ·{" "}
            {formatDistanceToNowStrict(new Date(post.created_at), { locale: ptBR })}
          </span>
        </div>

        {isOwnPost && (
          <DropdownMenu>
            <DropdownMenuTrigger className="h-fit rounded-full p-1.5 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex-shrink-0">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Opções do post</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem destructive onClick={handleDelete}>
                <Trash2 className="h-4 w-4" /> Apagar post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {post.content && (
        <p className="text-[15px] leading-relaxed mt-3 mb-3.5 whitespace-pre-wrap break-words">{post.content}</p>
      )}

      {post.media_urls?.length > 0 && (
        <div
          className={`grid gap-1.5 mb-3.5 rounded-[14px] overflow-hidden ${
            post.media_urls.length === 1 ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {post.media_urls.slice(0, 4).map((url, i) => (
            <div key={i} className="relative aspect-square bg-muted">
              <Image src={url} alt="" fill sizes="(max-width: 640px) 100vw, 600px" className="object-cover" />
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 sm:gap-5 text-muted-foreground flex-wrap">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-[13px] transition-colors ${
            liked ? "text-destructive" : "hover:text-foreground"
          }`}
        >
          <Heart className="h-[17px] w-[17px]" fill={liked ? "currentColor" : "none"} />
          {likesCount}
        </button>

        <button
          onClick={() => setCommentsOpen(true)}
          className="flex items-center gap-1.5 text-[13px] hover:text-foreground transition-colors"
        >
          <MessageCircle className="h-[17px] w-[17px]" />
          {post.comments_count}
        </button>

        <button className="flex items-center gap-1.5 text-[13px] hover:text-foreground transition-colors">
          <Repeat2 className="h-[17px] w-[17px]" />
        </button>

        {!isOwnPost && (
          <button
            onClick={() => setTipOpen(true)}
            className="flex items-center gap-1.5 text-[13px] hover:text-signal transition-colors ml-auto"
          >
            <Coins className="h-[17px] w-[17px]" />
            <span className="hidden sm:inline">Enviar coins</span>
          </button>
        )}
      </div>

      <TipDialog
        receiverId={post.author.id}
        receiverName={post.author.display_name}
        postId={post.id}
        open={tipOpen}
        onOpenChange={setTipOpen}
      />
      <CommentDialog
        postId={post.id}
        currentUserId={currentUserId}
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
      />
    </motion.article>
  );
}
