"use client";

import { useEffect, useState } from "react";

export const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;

type MediaKind = "avatar" | "banner";

function storageKey(kind: MediaKind) {
  return kind === "avatar" ? "nexus_avatar_url" : "nexus_banner_url";
}

export function useLocalProfileMedia() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  useEffect(() => {
    setAvatarUrl(localStorage.getItem("nexus_avatar_url"));
    setBannerUrl(localStorage.getItem("nexus_banner_url"));
  }, []);

  function selectImage(kind: MediaKind, file: File | undefined) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Selecione um arquivo de imagem válido.");
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      alert("A imagem precisa ter no máximo 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : null;
      if (!dataUrl) {
        alert("Não foi possível carregar esta imagem.");
        return;
      }

      try {
        localStorage.setItem(storageKey(kind), dataUrl);
        if (kind === "avatar") setAvatarUrl(dataUrl);
        else setBannerUrl(dataUrl);
        window.dispatchEvent(new StorageEvent("storage", { key: storageKey(kind), newValue: dataUrl }));
      } catch {
        alert("Não foi possível salvar a imagem. Tente usar um arquivo menor.");
      }
    };
    reader.onerror = () => alert("Não foi possível carregar esta imagem.");
    reader.readAsDataURL(file);
  }

  return { avatarUrl, bannerUrl, selectImage };
}