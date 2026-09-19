"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function FeedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [postText, setPostText] = useState("");

  const isModalOpen = searchParams.get("new") === "true";

  const closeModal = () => {
    router.push("/feed");
  };

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim()) return;

    alert(`Post enviado com sucesso: "${postText}"`); 
    setPostText("");
    closeModal();
  };

  return (
    <div className="w-full">
      {/* Texto padrão interno do feed */}
      <div className="text-center text-muted-foreground mt-20">
        Ainda não há posts por aqui. Que tal publicar o primeiro?
      </div>

      {/* MODAL DESIGN PREMIUM */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-start justify-center z-50 p-4 pt-20 md:pt-32 animate-in fade-in duration-200">
          <div className="bg-background border border-border rounded-2xl w-full max-w-lg shadow-2xl p-5 relative flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground">Nova Publicação</h2>
              <button 
                onClick={closeModal}
                className="text-muted-foreground hover:text-foreground text-sm p-1 rounded-md hover:bg-accent transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* Área de Digitação Estilo Twitter */}
            <form onSubmit={handlePostSubmit} className="space-y-4">
              <div className="flex gap-3 items-start">
                {/* Avatar Falso do Usuário */}
                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-sm text-muted-foreground shrink-0">
                  U
                </div>
                
                <textarea
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  placeholder="O que você está pensando hoje?"
                  className="w-full h-28 bg-transparent text-foreground placeholder:text-muted-foreground resize-none focus:outline-none text-base pt-1"
                  maxLength={280}
                />
              </div>
              
              {/* Barra Inferior com Contador de Caracteres e Botões */}
              <div className="flex items-center justify-between border-t border-border pt-4">
                {/* Contador de Letras sutil */}
                <span className={`text-xs ${postText.length >= 260 ? 'text-rose-500 font-medium' : 'text-muted-foreground'}`}>
                  {280 - postText.length} caracteres restantes
                </span>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium rounded-full hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!postText.trim()}
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
