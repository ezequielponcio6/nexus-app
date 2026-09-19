"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Image as ImageIcon,
  Video as VideoIcon,
  X,
  Heart,
  MessageCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Post {
  id: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  user_id: string;
}

// 1. O conteúdo principal fica aqui dentro
function FeedContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postText, setPostText] = useState("");
  const [sending, setSending] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"image" | "video" | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isModalOpen = searchParams.get("new") === "true";

  useEffect(() => {
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

        setPosts((data as Post[]) || []);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao buscar posts.";

        console.error("Erro ao buscar posts:", message);
      } finally {
        setLoading(false);
      }
    };

    void fetchPosts();
  }, [supabase]);

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

  const closeModal = () => {
    removeFile();
    setPostText("");
    router.push("/feed");
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    allowedType: "image" | "video"
  ) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
    const MAX_VIDEO_SIZE = 5 * 1024 * 1024;

    if (allowedType === "image" && !file.type.startsWith("image/")) {
      alert("Selecione uma imagem!");
      e.target.value = "";
      return;
    }

    if (allowedType === "video" && !file.type.startsWith("video/")) {
      alert("Selecione um vídeo!");
      e.target.value = "";
      return;
    }

    if (allowedType === "image" && file.size > MAX_IMAGE_SIZE) {
      alert("Imagem deve ter até 2MB!");
      e.target.value = "";
      return;
    }

    if (allowedType === "video" && file.size > MAX_VIDEO_SIZE) {
      alert("Vídeo deve ter até 5MB!");
      e.target.value = "";
      return;
    }

    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }

    const previewUrl = URL.createObjectURL(file);

    setSelectedFile(file);
    setFileType(allowedType);
    setFilePreview(previewUrl);
  };

  const handlePostSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!postText.trim() && !selectedFile) {
      return;
    }

    if (sending) {
      return;
    }

    try {
      setSending(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        alert("Você precisa estar logado para publicar!");
        return;
      }

      let uploadedMediaUrl: string | null = null;

      if (selectedFile) {
        const fileExt =
          selectedFile.name.split(".").pop()?.toLowerCase() || "file";

        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(filePath, selectedFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: selectedFile.type,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from("media")
          .getPublicUrl(filePath);

        uploadedMediaUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: postText.trim(),
        media_url: uploadedMediaUrl,
        media_type: fileType,
      });

      if (error) {
        throw error;
      }

      const { data: updatedPosts, error: fetchError } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setPosts((updatedPosts as Post[]) || []);

      closeModal();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro desconhecido ao criar publicação.";

      console.error("Erro ao criar publicação:", error);

      alert(`Erro ao criar publicação: ${message}`);
    } finally {
      setSending(false);
    }
  };

      return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-6 relative">
      <h1 className="text-xl font-bold border-b border-border pb-4 text-foreground">
        Seu Feed
      </h1>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">
          Carregando publicações...
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center text-muted-foreground mt-10 bg-zinc-50 dark:bg-zinc-900/50 p-8 rounded-xl border border-dashed border-border">
          Ainda não há posts por aqui. Que tal publicar o primeiro?
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-background border border-border p-4 rounded-xl shadow-sm space-y-3"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-muted-foreground">
                  U
                </div>
                <span className="text-sm font-semibold text-foreground">
                  Usuário do Nexus
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(post.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>

              {post.content && (
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                  {post.content}
                </p>
              )}

              {post.media_url && (
                <div className="rounded-lg overflow-hidden border border-border bg-muted/20 max-h-80 flex items-center justify-center">
                  {post.media_type === "image" ? (
                    <img
                      src={post.media_url}
                      alt="Imagem da publicação"
                      className="object-contain max-h-80 w-full"
                    />
                  ) : (
                    <video
                      src={post.media_url}
                      controls
                      preload="metadata"
                      className="max-h-80 w-full"
                    />
                  )}
                </div>
              )}

              <div className="flex gap-4 pt-2 border-t border-border/50 text-muted-foreground">
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs hover:text-rose-500 transition-colors"
                >
                  <Heart className="w-4 h-4" />
                  Curtir
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs hover:text-blue-500 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Comentar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= MODAL DE NOVA PUBLICAÇÃO ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background border border-border w-full max-w-lg rounded-xl shadow-xl overflow-hidden flex flex-col">
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Criar Publicação</h2>
              <button 
                type="button"
                onClick={closeModal}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handlePostSubmit} className="p-4 space-y-4">
              <textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="No que você está pensando?"
                className="w-full min-h-[120px] bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
                maxLength={280}
              />

              {/* Preview do Arquivo Selecionado */}
              {filePreview && (
                <div className="relative rounded-lg overflow-hidden border border-border bg-muted/10 max-h-48 flex items-center justify-center">
                  {fileType === "image" ? (
                    <img src={filePreview} alt="Preview" className="object-contain max-h-48 w-full" />
                  ) : (
                    <video src={filePreview} controls className="max-h-48 w-full" />
                  )}
                  <button
                    type="button"
                    onClick={removeFile}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Barra de Ferramentas / Botões Inferiores */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                {/* Inputs de arquivo ocultos controlados pelo useRef ou disparados por função */}
                <div className="flex items-center gap-2">
                  {/* Botão de Imagem */}
                  <input
                    type="file"
                    id="image-upload"
                    onChange={(e) => handleFileChange(e, "image")}
                    accept="image/*"
                    className="hidden"
                  />
                  <label
                    htmlFor="image-upload"
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    title="Adicionar imagem (Até 2MB)"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </label>

                  {/* Botão de Vídeo */}
                  <input
                    type="file"
                    id="video-upload"
                    onChange={(e) => handleFileChange(e, "video")}
                    accept="video/*"
                    className="hidden"
                  />
                  <label
                    htmlFor="video-upload"
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    title="Adicionar vídeo (Até 5MB)"
                  >
                    <VideoIcon className="w-5 h-5" />
                  </label>
                </div>

                {/* Ações: Cancelar e Publicar */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 bg-transparent text-muted-foreground hover:text-foreground rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={sending || (!postText.trim() && !selectedFile)}
                    className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {sending ? "Publicando..." : "Publicar"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={<div className="text-center py-10">Carregando...</div>}>
      <FeedContent />
    </Suspense>
  );
}
