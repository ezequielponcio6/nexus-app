"use client";

import { useState, useTransition } from "react";
import { Heart, MoreHorizontal, Reply, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toggleCommentLike, deleteComment } from "@/actions/comments";
import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export interface CommentData {
  id: string;
  content: string;
  created_at: string;
  likes_count: number;
  parent_comment_id: string | null;
  author_id: string;
  author: { username: string; display_name: string; avatar_url: string | null };
}

export function CommentItem({
  comment,
  currentUserId,
  isLiked,
  onToggleLike,
  onReply,
  onDeleted,
  replyToName,
}: {
  comment: CommentData;
  currentUserId: string;
  isLiked: boolean;
  onToggleLike: (id: string, liked: boolean) => void;
  onReply: (comment: CommentData) => void;
  onDeleted: (id: string) => void;
  replyToName?: string;
}) {
  const [liked, setLiked] = useState(isLiked);
  const [likesCount, setLikesCount] = useState(comment.likes_count);
  const [, startTransition] = useTransition();
  const isOwn = comment.author_id === currentUserId;

  function handleLike() {
    const next = !liked;
    setLiked(next);
    setLikesCount((c) => c + (next ? 1 : -1));
    onToggleLike(comment.id, next);

    startTransition(async () => {
      try {
        await toggleCommentLike(comment.id, liked);
      } catch {
        setLiked(liked);
        setLikesCount((c) => c + (next ? -1 : 1));
        onToggleLike(comment.id, liked);
        toast.error("Não foi possível curtir.");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteComment(comment.id);
        onDeleted(comment.id);
      } catch {
        toast.error("Não foi possível apagar.");
      }
    });
  }

  return (
    <div className="flex gap-2.5 py-3">
      <Avatar name={comment.author.display_name} src={comment.author.avatar_url} size={32} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-[13.5px] font-semibold">{comment.author.display_name}</span>
          <span className="text-[11.5px] text-muted-foreground">
            {formatDistanceToNowStrict(new Date(comment.created_at), { locale: ptBR })}
          </span>
        </div>

        {replyToName && (
          <span className="text-[11.5px] text-signal">respondendo a @{replyToName}</span>
        )}

        <p className="text-[14px] leading-snug mt-0.5 whitespace-pre-wrap break-words">{comment.content}</p>

        <div className="flex items-center gap-4 mt-1.5 text-muted-foreground">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 text-[12px] transition-colors ${
              liked ? "text-destructive" : "hover:text-foreground"
            }`}
          >
            <Heart className="h-3.5 w-3.5" fill={liked ? "currentColor" : "none"} />
            {likesCount > 0 && likesCount}
          </button>
          <button
            onClick={() => onReply(comment)}
            className="flex items-center gap-1 text-[12px] hover:text-foreground transition-colors"
          >
            <Reply className="h-3.5 w-3.5" />
            Responder
          </button>
        </div>
      </div>

      {isOwn && (
        <DropdownMenu>
          <DropdownMenuTrigger className="h-fit rounded-full p-1 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Opções do comentário</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem destructive onClick={handleDelete}>
              <Trash2 className="h-4 w-4" /> Apagar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
