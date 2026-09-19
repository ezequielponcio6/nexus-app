"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CommentItem, type CommentData } from "@/components/feed/comment-item";
import { createClient } from "@/lib/supabase/client";
import { createComment } from "@/actions/comments";
import { X } from "lucide-react";
import { toast } from "sonner";

export function CommentDialog({
  postId,
  currentUserId,
  open,
  onOpenChange,
}: {
  postId: string;
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [replyTo, setReplyTo] = useState<CommentData | null>(null);
  const [content, setContent] = useState("");
  const [pending, setPending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadComments = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const [{ data: commentRows }, { data: likedRows }] = await Promise.all([
      supabase
        .from("comments")
        .select(
          `id, content, created_at, likes_count, parent_comment_id, author_id,
           author:profiles!comments_author_id_fkey ( username, display_name, avatar_url )`
        )
        .eq("post_id", postId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true }),
      supabase.from("likes").select("comment_id").eq("user_id", currentUserId).not("comment_id", "is", null),
    ]);

    setComments((commentRows as any) ?? []);
    setLikedIds(new Set((likedRows ?? []).map((r) => r.comment_id as string)));
    setLoading(false);
  }, [postId, currentUserId]);

  useEffect(() => {
    if (!open) return;
    loadComments();

    const supabase = createClient();
    const channel = supabase
      .channel(`comments:${postId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
        async (payload) => {
          const { data: author } = await supabase
            .from("profiles")
            .select("username, display_name, avatar_url")
            .eq("id", payload.new.author_id)
            .single();
          if (!author) return;

          setComments((prev) => {
            if (prev.some((c) => c.id === payload.new.id)) return prev;
            return [
              ...prev,
              {
                id: payload.new.id,
                content: payload.new.content,
                created_at: payload.new.created_at,
                likes_count: 0,
                parent_comment_id: payload.new.parent_comment_id,
                author_id: payload.new.author_id,
                author,
              },
            ];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, postId, loadComments]);

  async function handleSubmit() {
    if (!content.trim() || pending) return;
    setPending(true);
    const { error } = await createComment(postId, content, replyTo?.id ?? null);
    setPending(false);

    if (error) {
      toast.error(error);
      return;
    }
    setContent("");
    setReplyTo(null);
  }

  const commentsById = new Map(comments.map((c) => [c.id, c]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col p-0 gap-0 max-h-[85vh]">
        <DialogHeader className="px-5 pt-5 pb-3 mb-0 border-b border-border">
          <DialogTitle>Comentários</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 divide-y divide-border">
          {loading && <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>}
          {!loading && comments.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum comentário ainda. Seja o primeiro.
            </p>
          )}
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              isLiked={likedIds.has(comment.id)}
              replyToName={
                comment.parent_comment_id
                  ? commentsById.get(comment.parent_comment_id)?.author.username
                  : undefined
              }
              onToggleLike={(id, liked) =>
                setLikedIds((prev) => {
                  const next = new Set(prev);
                  liked ? next.add(id) : next.delete(id);
                  return next;
                })
              }
              onReply={(c) => {
                setReplyTo(c);
                textareaRef.current?.focus();
              }}
              onDeleted={(id) => setComments((prev) => prev.filter((c) => c.id !== id))}
            />
          ))}
        </div>

        <div className="border-t border-border p-4">
          {replyTo && (
            <div className="flex items-center justify-between mb-2 rounded-lg bg-muted px-3 py-1.5 text-xs">
              <span>
                Respondendo a <strong>@{replyTo.author.username}</strong>
              </span>
              <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escreva um comentário…"
              rows={1}
              maxLength={1000}
              className="min-h-[42px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <Button size="sm" disabled={pending || !content.trim()} onClick={handleSubmit}>
              {pending ? "…" : "Enviar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
