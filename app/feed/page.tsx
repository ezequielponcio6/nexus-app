"use client";

import { useState, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Image as ImageIcon, Video as VideoIcon, X } from "lucide-react";

function FeedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [postText, setPostText] = useState("");
  
  // Estados para controlar o arquivo anexado
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"image" | "video" | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isModalOpen = searchParams.get("new") === "true";

  const closeModal = () => {
    // Limpa os arquivos ao fechar
    removeFile();
    router.push("/feed");
  };

  // Função para validar o arquivo selecionado (Limite de MB)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, allowedType: "image" | "video") => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Define os limites em Bytes (1 MB = 1024 * 1024 Bytes)
    const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
    const MAX_VIDEO_SIZE = 5 * 1024 * 1024; // 5MB

    if (allowedType === "image" && !file.type.startsWith("image/")) {
      alert("Por favor, selecione apenas arquivos de imagem!");
      return;
    }

    if (allowedType === "video" && !file.type.startsWith("video/")) {
      alert("Por favor, selecione apenas arquivos de vídeo!");
      return;
    }

    // Validação de Tamanho (Onde evitamos o B.O no futuro)
    if (allowedType === "image" && file.size > MAX_IMAGE_SIZE) {
      alert("A imagem é muito grande! Escolha uma foto de até 2MB.");
      return;
    }

    if (allowedType === "video" && file.size > MAX_VIDEO_SIZE) {
      alert("O vídeo é muito grande! Escolha um arquivo de até 5MB.");
      return;
    }

    // Guarda o arquivo e cria um link temporário para exibir na tela antes de postar
    setSelectedFile(file);
    setFileType(allowedType);
    setFilePreview(URL.createObjectURL(file));
  };

  const removeFile = () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setSelectedFile(null);
    setFilePreview(null);
    setFileType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim() && !selectedFile) return;

    // Temporário até conectarmos ao banco do Supabase
    alert(
      `Publicação criada!\nTexto: "${postText}"\nArquivo anexado: ${
        selectedFile ? `selectedFile.name ({fileType})` : "Nenhum"
      }`
    );

    setPostText("");
    closeModal();
  };

  return (
    <div className="w-full">
      <div className="text-center text-muted-foreground mt-20">
        Ainda não há posts por aqui. Que tal publicar o primeiro?
      </div>

      {/* MODAL COM ARQUIVOS E LIMITES DE MB */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-start justify-center z-50 p-4 pt-20 md:pt-32">
          <div className="bg-background border border-border rounded-2xl w-full max-w-lg shadow-2xl p-5 relative flex flex-col gap-4">
            
            {/* Cabeçalho */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground">Nova Publicação</h2>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground text-sm p-1 rounded-md hover:bg-accent transition-colors">
                ✕
              </button>
            </div>
            
            {/* Área de Texto */}
            <form onSubmit={handlePostSubmit} className="space-y-4">
              <div className="flex gap-3 items-start">
                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-sm text-muted-foreground shrink-0">
                  U
                </div>
                
                <div className="w-full space-y-3">
                  <textarea
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    placeholder="O que você quer compartilhar hoje?"
                    className="w-full h-24 bg-transparent text-foreground placeholder:text-muted-foreground resize-none focus:outline-none text-base pt-1"
                    maxLength={280}
                  />

                  {/* PREVIEW DO ARQUIVO ANEXADO (Se houver) */}
                  {filePreview && (
                    <div className="relative rounded-xl overflow-hidden border border-border bg-muted/30 max-h-60 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={removeFile}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors z-10"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      {fileType === "image" ? (
                        <img src={filePreview} alt="Preview do anexo" className="object-contain max-h-60 w-full" />
                      ) : (
                        <video src={filePreview} controls className="max-h-60 w-full" />
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Controles Ocultos de Input */}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,video/*"
                onChange={(e) => {
                  const type = e.target.files?.[0]?.type.startsWith("video/") ? "video" : "image";
                  handleFileChange(e, type);
                }}
              />

              {/* Barra Inferior com Ícones e Botão de Envio */}
              <div className="flex items-center justify-between border-t border-border pt-4">
                {/* Botões de Mídia Estilo Twitter */}
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={!!selectedFile}
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = "image/*";
                        fileInputRef.current.click();
                      }
                    }}
                    className="p-2 text-zinc-600 hover:bg-accent rounded-full transition-colors disabled:opacity-30"
                    title="Adicionar imagem (Máx 2MB)"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    disabled={!!selectedFile}
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = "video/*";
                        fileInputRef.current.click();
                      }
                    }}
                    className="p-2 text-zinc-600 hover:bg-accent rounded-full transition-colors disabled:opacity-30"
                    title="Adicionar vídeo (Máx 5MB)"
                  >
                    <VideoIcon className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-muted-foreground mr-2">
                    {280 - postText.length}
                  </span>
                  <button
                    type="submit"
                    disabled={!postText.trim() && !selectedFile}
                    className="px-5 py-2 text-sm font-semibold text-white bg-zinc-950 dark:bg-zinc-50 dark:text-zinc-950 rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 shadow-sm"
                  >
                    Publicar
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
    <Suspense fallback={<div className="text-center mt-20 text-muted-foreground">Carregando feed...</div>}>
      <FeedContent />
    </Suspense>
  );
}
