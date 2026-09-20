"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Image as ImageIcon,
  Video as VideoIcon,
  X,
  Heart,
  MessageCircle,
  Coins,
  MoreVertical,
  Pencil,
  Trash,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PersistentPostActions } from "@/components/feed/persistent-post-actions";
import { Avatar } from "@/components/ui/avatar";

interface Post {
  id: string;
  content: string | null;
  media_urls: string[];
  created_at: string;
  author_id: string;
  visibility: string;
  is_premium_content: boolean;
}

interface LocalComment {
  id: string;
  content: string;
  author: string;
}

function FeedContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [expandedPost, setExpandedPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [postText, setPostText] = useState("");
  const [sending, setSending] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"image" | "video" | null>(null);

  // Estados para edição e menu
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, LocalComment[]>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isModalOpen = searchParams.get("new") === "true";

  const [activeColor, setActiveColor] = useState("text-foreground");

  useEffect(() => {
    const savedColor = localStorage.getItem("nexus_name_color");

    if (savedColor) {
      setActiveColor(savedColor);
    }

    fetchPosts();
  }, []);

  // ==============================
  // BUSCAR POSTS
  // ==============================
  const fetchPosts = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setPosts(data || []);
    } catch (err: any) {
      console.error("Erro ao buscar posts:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // FECHAR MODAL
  // ==============================
  const closeModal = () => {
    removeFile();
    setPostText("");
    router.push("/feed");
  };

  // ==============================
  // SELECIONAR ARQUIVO
  // ==============================
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    allowedType: "image" | "video"
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    // Limite de 50 MB
    if (file.size > 50 * 1024 * 1024) {
      alert("O arquivo é muito grande. O limite é de 50 MB.");
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    setFileType(allowedType);

    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }

    setFilePreview(URL.createObjectURL(file));
  };

  // ==============================
  // REMOVER ARQUIVO
  // ==============================
  const removeFile = () => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }

    setSelectedFile(null);
    setFilePreview(null);
    setFileType(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ==============================
  // CRIAR PUBLICAÇÃO
  // ==============================
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!postText.trim() && !selectedFile) {
      return;
    }

    try {
      setSending(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Você precisa estar logado!");
        return;
      }

      let uploadedMediaUrl: string | null = null;

      // Upload da mídia
      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop()?.toLowerCase();

        const fileName = `${crypto.randomUUID()}${fileExt ? `.${fileExt}` : ""}`;

        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("post-media")
          .upload(filePath, selectedFile);

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage
          .from("post-media")
          .getPublicUrl(filePath);

        uploadedMediaUrl = data.publicUrl;
      }

      // Inserir publicação
      const { error } = await (supabase.from("posts") as any).insert({
        author_id: user.id,
        content: postText.trim() || null,
        media_urls: uploadedMediaUrl ? [uploadedMediaUrl] : [],
        visibility: "public",
        is_premium_content: false,
      });

      if (error) {
        throw error;
      }

      await fetchPosts();

      closeModal();
    } catch (err: any) {
      console.error("Erro ao criar publicação:", err);

      alert(`Erro ao criar publicação: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  // ==============================
  // SISTEMA DE GORJETAS
  // ==============================
  const handleTip = (valor: number) => {
    const savedCoins = localStorage.getItem("nexus_coins") || "0";

    const saldoAtual = Number(savedCoins);

    if (saldoAtual < valor) {
      alert("Saldo insuficiente! Visite a Carteira para minerar ou comprar mais moedas.");

      return;
    }

    const novoSaldo = saldoAtual - valor;

    localStorage.setItem("nexus_coins", novoSaldo.toString());

    alert(`🎉 Gorjeta enviada com sucesso! Você apoiou este criador com ${valor} NX$.`);
  };

  const handleLike = (postId: string) => {
    setLikedPosts((current) => {
      const isLiked = Boolean(current[postId]);
      return { ...current, [postId]: !isLiked };
    });
    setLikeCounts((current) => {
      const nextLiked = !Boolean(likedPosts[postId]);
      return { ...current, [postId]: nextLiked ? 1 : 0 };
    });
  };

  const handleCommentSubmit = (postId: string) => {
    const content = (commentInputs[postId] ?? "").trim();
    if (!content) return;

    const comment: LocalComment = {
      id: `${postId}-${Date.now()}`,
      content,
      author: "@cole.duda1789",
    };

    setCommentsByPost((current) => ({
      ...current,
      [postId]: [...(current[postId] ?? []), comment],
    }));
    setCommentInputs((current) => ({ ...current, [postId]: "" }));
  };

  // ==============================
  // EXCLUIR PUBLICAÇÃO
  // ==============================
  const handleDeletePost = async (id: string) => {
    const confirmar = confirm(
      "Tem certeza que deseja apagar esta publicação permanentemente?"
    );

    if (!confirmar) {
      return;
    }

    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      setPosts((currentPosts) =>
        currentPosts.filter((post) => post.id !== id)
      );

      setActiveMenuId(null);

      alert("Publicação excluída com sucesso!");
    } catch (err: any) {
      alert(`Erro ao excluir: ${err.message}`);
    }
  };

  // ==============================
  // INICIAR EDIÇÃO
  // ==============================
  const handleStartEdit = (id: string, content: string) => {
    setEditingPostId(id);
    setEditText(content);
    setActiveMenuId(null);
  };

  // ==============================
  // SALVAR EDIÇÃO
  // ==============================
  const handleSaveEdit = async (id: string) => {
    if (!editText.trim()) {
      alert("A publicação não pode ficar vazia.");
      return;
    }

    try {
      const { error } = await (supabase.from("posts") as any)
        .update({
          content: editText.trim(),
        })
        .eq("id", id);

      if (error) {
        throw error;
      }

      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === id
            ? {
                ...post,
                content: editText.trim(),
              }
            : post
        )
      );

      setEditingPostId(null);
      setEditText("");

      alert("Publicação atualizada!");
    } catch (err: any) {
      alert(`Erro ao editar: ${err.message}`);
    }
  };

  // ==============================
  // RENDER
  // ==============================
  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-6">
      {/* CABEÇALHO */}
      <h1 className="text-xl font-bold border-b border-border pb-4 text-foreground">
        Seu Feed
      </h1>

      {/* LOADING */}
      {loading ? (
        <div className="text-center py-10 text-muted-foreground">
          Carregando publicações...
        </div>
      ) : posts.length === 0 ? (
        /* FEED VAZIO */
        <div className="text-center text-muted-foreground mt-10 bg-zinc-50 dark:bg-zinc-900/50 p-8 rounded-xl border border-dashed border-border">
          Ainda não há posts por aqui.
        </div>
      ) : (
        /* LISTA DE POSTS */
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex gap-3 border-b border-border/70 bg-background px-1 py-4 first:pt-1"
            >
              <div className="shrink-0 pt-1">
                <Avatar name="Cole Duda" size={40} className="h-10 w-10 rounded-full" />
              </div>

              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className={`truncate text-sm font-bold ${activeColor}`}>@cole.duda1789</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(post.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>

                {post.content && <p className="whitespace-pre-wrap break-words text-[15px] leading-6 text-foreground">{post.content}</p>}

                {post.media_urls?.[0] && (
                  <div
                    onClick={() => setExpandedPost(post)}
                    className="w-full max-h-[400px] cursor-pointer overflow-hidden rounded-2xl border border-border/70 bg-muted/20 transition-opacity hover:opacity-95"
                  >
                    {post.media_urls[0].match(/\.(mp4|webm|mov)(\?|$)/i) ? (
                      <video src={post.media_urls[0]} controls className="block max-h-[400px] w-full object-cover" />
                    ) : (
                      <img src={post.media_urls[0]} alt="Mídia da publicação" className="block max-h-[400px] w-full object-cover" />
                    )}
                  </div>
                )}

                <PersistentPostActions
                  post={post}
                  onUpdated={(content) => setPosts((current) => current.map((item) => item.id === post.id ? { ...item, content } : item))}
                  onDeleted={() => setPosts((current) => current.filter((item) => item.id !== post.id))}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {expandedPost && expandedPost.media_urls?.[0] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => setExpandedPost(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Publicação expandida"
        >
          <div
            className="relative flex h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-background md:flex-row"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setExpandedPost(null)}
              className="absolute right-3 top-3 z-20 rounded-full border border-white/20 bg-black/50 p-2 text-white transition-colors hover:bg-black/80"
              aria-label="Fechar publicação expandida"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex h-[52%] w-full items-center justify-center bg-zinc-950 p-3 md:h-full md:w-[60%] md:p-6">
              {expandedPost.media_urls[0].match(/\.(mp4|webm|mov)(\?|$)/i) ? (
                <video src={expandedPost.media_urls[0]} controls autoPlay className="max-h-full max-w-full object-contain" />
              ) : (
                <img src={expandedPost.media_urls[0]} alt="Mídia expandida da publicação" className="max-h-full max-w-full object-contain" />
              )}
            </div>

            <aside className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto border-t border-border bg-background p-5 md:h-full md:w-[40%] md:border-l md:border-t-0">
              <div className="flex items-center gap-3 border-b border-border pb-4 pr-8">
                <Avatar name="Cole Duda" size={40} className="h-10 w-10 rounded-full" />
                <div className="min-w-0">
                  <p className={`truncate text-sm font-bold ${activeColor}`}>@cole.duda1789</p>
                  <p className="text-xs text-muted-foreground">{new Date(expandedPost.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>

              {expandedPost.content && (
                <p className="whitespace-pre-wrap break-words py-5 text-sm leading-6 text-foreground">{expandedPost.content}</p>
              )}

              <PersistentPostActions
                post={expandedPost}
                onUpdated={(content) => {
                  setPosts((current) => current.map((item) => item.id === expandedPost.id ? { ...item, content } : item));
                  setExpandedPost((current) => current ? { ...current, content } : current);
                }}
                onDeleted={() => {
                  setPosts((current) => current.filter((item) => item.id !== expandedPost.id));
                  setExpandedPost(null);
                }}
              />
            </aside>
          </div>
        </div>
      )}

      {/* ==============================
          MODAL NOVA PUBLICAÇÃO
      ============================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* CABEÇALHO MODAL */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">
                Nova Publicação
              </h2>

              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* FORMULÁRIO */}
            <form onSubmit={handlePostSubmit} className="p-4 space-y-4">
              <textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="O que você está pensando hoje?"
                className="w-full h-24 bg-transparent text-foreground placeholder:text-muted-foreground resize-none focus:outline-none text-base"
                maxLength={280}
              />

              {/* PREVIEW */}
              {filePreview && (
                <div className="relative rounded-xl overflow-hidden border border-border bg-muted/20">
                  <button
                    type="button"
                    onClick={removeFile}
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {fileType === "video" ? (
                    <video
                      src={filePreview}
                      controls
                      className="w-full max-h-64 object-contain"
                    />
                  ) : (
                    <img
                      src={filePreview}
                      alt="Pré-visualização"
                      className="w-full max-h-64 object-contain"
                    />
                  )}
                </div>
              )}

              {/* INPUT DE ARQUIVO */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const selected = e.target.files?.[0];

                  if (!selected) return;

                  const type = selected.type.startsWith("video/")
                    ? "video"
                    : "image";

                  handleFileChange(e, type);
                }}
              />

              {/* RODAPÉ */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.click();
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  <ImageIcon className="w-4 h-4" />
                  <VideoIcon className="w-4 h-4" />
                  Mídia
                </button>

                <button
                  type="submit"
                  disabled={sending || (!postText.trim() && !selectedFile)}
                  className="px-5 py-2 text-sm font-bold bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  {sending ? "Postando..." : "Publicar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================
// PÁGINA
// ==============================
export default function FeedPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-2xl mx-auto p-4 text-center text-muted-foreground">
          Carregando feed...
        </div>
      }
    >
      <FeedContent />
    </Suspense>
  );
}