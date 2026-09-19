"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { ImagePlus, X, Globe, Lock, Loader2 } from "lucide-react";
import { createPost, type PostFormState } from "@/actions/posts";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { PostVisibility } from "@/types/database.types";

const initialState: PostFormState = { error: null };
const MAX_FILES = 4;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB, alinhado ao limite do bucket no schema.sql

interface UploadedImage {
  file: File;
  previewUrl: string;
  uploadedUrl: string | null;
  uploading: boolean;
  error: boolean;
}

export function Composer({ onDone, isCreator }: { onDone: () => void; isCreator: boolean }) {
  const [state, formAction, pending] = useActionState(createPost, initialState);
  const [content, setContent] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [visibility, setVisibility] = useState<PostVisibility>("public");
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      formRef.current?.reset();
      setContent("");
      setImages([]);
      setVisibility("public");
      toast.success("Publicado!");
      onDone();
    }
    wasPending.current = pending;
  }, [pending, state.error, onDone]);

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList) return;
    const files = Array.from(fileList).slice(0, MAX_FILES - images.length);

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} excede 10MB.`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      const entry: UploadedImage = { file, previewUrl, uploadedUrl: null, uploading: true, error: false };
      setImages((prev) => [...prev, entry]);

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("not authenticated");

        const ext = file.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage.from("post-media").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from("post-media").getPublicUrl(path);

        setImages((prev) =>
          prev.map((img) =>
            img.previewUrl === previewUrl
              ? { ...img, uploadedUrl: publicUrlData.publicUrl, uploading: false }
              : img
          )
        );
      } catch (err) {
        console.error("upload error:", err);
        setImages((prev) =>
          prev.map((img) => (img.previewUrl === previewUrl ? { ...img, uploading: false, error: true } : img))
        );
        toast.error(`Falha ao enviar ${file.name}.`);
      }
    }
  }

  function removeImage(previewUrl: string) {
    setImages((prev) => {
      const target = prev.find((i) => i.previewUrl === previewUrl);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.previewUrl !== previewUrl);
    });
  }

  const anyUploading = images.some((i) => i.uploading);
  const mediaUrls = images.filter((i) => i.uploadedUrl).map((i) => i.uploadedUrl as string);
  const canSubmit = (content.trim().length > 0 || mediaUrls.length > 0) && !anyUploading && !pending;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="mb-5 overflow-hidden rounded-2xl border border-border bg-card p-4"
    >
      <form ref={formRef} action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="media_urls" value={JSON.stringify(mediaUrls)} />
        <input type="hidden" name="visibility" value={visibility} />

        <Textarea
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="O que está acontecendo?"
          rows={3}
          maxLength={3000}
          autoFocus
        />

        {images.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            <AnimatePresence>
              {images.map((img) => (
                <motion.div
                  key={img.previewUrl}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative aspect-square rounded-lg overflow-hidden bg-muted"
                >
                  <Image src={img.previewUrl} alt="" fill className="object-cover" unoptimized />
                  {img.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </div>
                  )}
                  {img.error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-destructive/70 text-[10px] text-white text-center p-1">
                      Falhou
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(img.previewUrl)}
                    className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {state.error && <p className="text-sm text-destructive">{state.error}</p>}

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              hidden
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={images.length >= MAX_FILES}
              className="flex items-center gap-1.5 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40"
              aria-label="Adicionar imagem"
            >
              <ImagePlus className="h-[18px] w-[18px]" />
            </button>

            {isCreator && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {visibility === "subscribers" ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    <Globe className="h-3.5 w-3.5" />
                  )}
                  {visibility === "subscribers" ? "Assinantes" : "Público"}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setVisibility("public")}>
                    <Globe className="h-4 w-4" /> Público
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setVisibility("subscribers")}>
                    <Lock className="h-4 w-4" /> Só assinantes
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onDone}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={!canSubmit}>
              {pending ? "Publicando…" : "Publicar"}
            </Button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
