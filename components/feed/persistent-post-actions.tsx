"use client";

import { useEffect, useState } from "react";
import { Coins, Heart, MessageCircle, MoreVertical, Pencil, Save, Trash } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sanitizeTextInput } from "@/lib/sanitize";
import { formatRelativeTime } from "@/lib/format-relative-time";

type PersistentPost = {
  id: string;
  content: string | null;
  author_id: string;
};

type PersistentComment = {
  id: string;
  content: string;
  author_id: string;
  authorName: string;
  created_at: string;
};

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: string }).message);
  }
  return error instanceof Error ? error.message : "Não foi possível concluir a ação.";
}

export function PersistentPostActions({
  post,
  currentUserId,
  onUpdated,
  onDeleted,
}: {
  post: PersistentPost;
  currentUserId?: string;
  onUpdated?: (content: string) => void;
  onDeleted?: () => void;
}) {
  const supabase = createClient();
  const [userId, setUserId] = useState(currentUserId ?? "");
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<PersistentComment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.content ?? "");
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadUserAndLikes = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const resolvedUserId = currentUserId ?? authData.user?.id ?? "";
      if (cancelled) return;
      setUserId(resolvedUserId);

      const { data: likeRows, error } = await (supabase.from("likes") as any)
        .select("user_id")
        .eq("post_id", post.id);
      if (cancelled) return;
      if (!error) {
        setLikeCount(likeRows?.length ?? 0);
        setLiked(Boolean(resolvedUserId && likeRows?.some((row: { user_id: string }) => row.user_id === resolvedUserId)));
      }
    };

    void loadUserAndLikes();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, post.id]);

  async function loadComments() {
    const { data: commentRows, error } = await (supabase.from("comments") as any)
      .select("id, content, author_id, created_at")
      .eq("post_id", post.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (error) {
      alert(`Erro ao carregar comentários: ${getErrorMessage(error)}`);
      return;
    }

    const rows = (commentRows ?? []) as Array<Omit<PersistentComment, "authorName">>;
    const authorIds = [...new Set(rows.map((comment) => comment.author_id))];
    const { data: authors } = authorIds.length
      ? await (supabase.from("profiles") as any).select("id, username, display_name").in("id", authorIds)
      : { data: [] };
    const authorMap = new Map((authors ?? []).map((author: { id: string; username: string; display_name: string }) => [author.id, author.username || author.display_name]));

    setComments(rows.map((comment) => ({ ...comment, authorName: `@${authorMap.get(comment.author_id) ?? "usuario"}` })));
  }

  async function handleLike() {
    if (!userId || pending) return;
    setPending(true);
    try {
      const likesTable = supabase.from("likes") as any;
      const result = liked
        ? await likesTable.delete().eq("post_id", post.id).eq("user_id", userId)
        : await likesTable.insert({ post_id: post.id, user_id: userId });
      if (result.error) throw result.error;

      const { data: likeRows, error } = await likesTable.select("user_id").eq("post_id", post.id);
      if (error) throw error;
      setLiked(!liked);
      setLikeCount(likeRows?.length ?? 0);
    } catch (error) {
      alert(`Erro ao atualizar curtida: ${getErrorMessage(error)}`);
    } finally {
      setPending(false);
    }
  }

  async function handleComment() {
    const content = sanitizeTextInput(commentText, 1000).trim();
    if (!content || !userId || pending) return;
    setPending(true);
    try {
      const { error } = await (supabase.from("comments") as any).insert({
        post_id: post.id,
        author_id: userId,
        content,
        parent_comment_id: null,
      });
      if (error) throw error;
      setCommentText("");
      await loadComments();
    } catch (error) {
      alert(`Erro ao enviar comentário: ${getErrorMessage(error)}`);
    } finally {
      setPending(false);
    }
  }

  async function handleSaveEdit() {
    const content = sanitizeTextInput(editText, 3000).trim();
    if (!content || pending) return;
    setPending(true);
    try {
      const { error } = await (supabase.from("posts") as any).update({ content }).eq("id", post.id);
      if (error) throw error;
      setEditing(false);
      setEditText(content);
      onUpdated?.(content);
    } catch (error) {
      alert(`Erro ao editar publicação: ${getErrorMessage(error)}`);
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    setMenuOpen(false);
    if (!window.confirm("Tem certeza que deseja apagar esta publicação permanentemente?")) return;
    if (pending) return;
    setPending(true);
    try {
      const { error } = await (supabase.from("posts") as any).delete().eq("id", post.id);
      if (error) throw error;
      onDeleted?.();
    } catch (error) {
      alert(`Erro ao excluir publicação: ${getErrorMessage(error)}`);
    } finally {
      setPending(false);
    }
  }

  function handleTip(amount: number) {
    const balance = Number(localStorage.getItem("nexus_coins") ?? "0");
    if (!Number.isFinite(balance) || balance < amount) {
      alert("Saldo insuficiente! Visite a Carteira para minerar ou comprar mais moedas.");
      return;
    }
    localStorage.setItem("nexus_coins", String(balance - amount));
    alert(`🎉 Gorjeta enviada com sucesso! Você apoiou este criador com ${amount} NX$.`);
  }

  const isOwnPost = Boolean(userId && userId === post.author_id);

  return (
    <div className="space-y-3">
      {editing && (
        <div className="space-y-2">
          <textarea value={editText} onChange={(event) => setEditText(event.target.value)} maxLength={3000} rows={3} className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-signal focus:ring-2 focus:ring-signal/20" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted">Cancelar</button>
            <button type="button" onClick={handleSaveEdit} disabled={pending} className="flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-xs font-bold text-background disabled:opacity-50"><Save className="h-3.5 w-3.5" />Salvar</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={handleLike} disabled={pending || !userId} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${liked ? "bg-rose-500/10 text-rose-500" : "text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"}`}>
            <Heart className="h-4 w-4" fill={liked ? "currentColor" : "none"} /> {likeCount} Curtida{likeCount === 1 ? "" : "s"}
          </button>
          <button type="button" onClick={() => { const next = !showComments; setShowComments(next); if (next) void loadComments(); }} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <MessageCircle className="h-4 w-4" /> Comentar{comments.length ? ` (${comments.length})` : ""}
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => handleTip(5)} className="rounded-md border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-black text-amber-500 hover:bg-amber-500/20">5 NX$</button>
          <button type="button" onClick={() => handleTip(10)} className="rounded-md border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-black text-amber-500 hover:bg-amber-500/20">10 NX$</button>
          <Coins className="ml-1 h-4 w-4 text-amber-500" />
        </div>

        {isOwnPost && (
          <div className="relative">
            <button type="button" onClick={() => setMenuOpen((open) => !open)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Opções da publicação"><MoreVertical className="h-4 w-4" /></button>
            {menuOpen && (
              <div className="absolute bottom-full right-0 z-20 mb-1 w-32 rounded-xl border border-border bg-card p-1 shadow-xl">
                <button type="button" onClick={() => { setEditing(true); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold hover:bg-muted"><Pencil className="h-3.5 w-3.5" />Editar</button>
                <button type="button" onClick={handleDelete} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10"><Trash className="h-3.5 w-3.5" />Excluir</button>
              </div>
            )}
          </div>
        )}
      </div>

      {showComments && (
        <div className="space-y-3 border-t border-border pt-3">
          <div className="flex gap-2">
            <input value={commentText} onChange={(event) => setCommentText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void handleComment(); }} placeholder="Escreva um comentário..." maxLength={1000} className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-signal focus:ring-2 focus:ring-signal/20" />
            <button type="button" onClick={() => void handleComment()} disabled={pending || !commentText.trim()} className="rounded-xl bg-foreground px-3 py-2 text-xs font-bold text-background disabled:opacity-40">Enviar</button>
          </div>
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-bold text-foreground">{comment.authorName}</p>
                <time className="text-[10px] text-muted-foreground">{formatRelativeTime(comment.created_at)}</time>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{comment.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
