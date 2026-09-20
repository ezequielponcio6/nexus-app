"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, FileText, MessageCircle, Paperclip, Send, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";

type Contact = { name: string; username: string; avatar: string; id?: string };
type Message = { id: string; sender_id: string; receiver_id: string; content: string | null; media_url: string | null; created_at: string };

const CONTACTS: Contact[] = [
  { name: "Luna Vale", username: "lunavale", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&crop=face" },
  { name: "Ari Sato", username: "arisato", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop&crop=face" },
  { name: "Rafael Diniz", username: "rafaeldiniz", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&fit=crop&crop=face" },
];
const MAX_MEDIA_BYTES = 2 * 1024 * 1024;

function isVideo(url: string) { return /\.(mp4|webm|mov)(\?|$)/i.test(url); }
function isDocument(url: string) { return /\.(pdf|doc|docx)(\?|$)/i.test(url); }

export function DirectMessages() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [userId, setUserId] = useState("");
  const [contacts, setContacts] = useState<Contact[]>(CONTACTS);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const loadUserAndContacts = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      setUserId(auth.user.id);
      const { data: profiles } = await (supabase.from("profiles") as any).select("id, username, display_name, avatar_url").in("username", CONTACTS.map((contact) => contact.username));
      if (profiles) {
        setContacts(CONTACTS.map((contact) => {
          const profile = profiles.find((item: { username: string }) => item.username === contact.username);
          return profile ? { ...contact, id: profile.id, name: profile.display_name ?? contact.name, avatar: profile.avatar_url ?? contact.avatar } : contact;
        }));
      }
    };
    void loadUserAndContacts();
  }, []);

  const fetchMessages = async (contact: Contact) => {
    if (!userId || !contact.id) {
      setMessages([]);
      return;
    }
    setLoading(true);
    const { data, error } = await (supabase.from("messages") as any)
      .select("id, sender_id, receiver_id, content, media_url, created_at")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${contact.id}),and(sender_id.eq.${contact.id},receiver_id.eq.${userId})`)
      .order("created_at", { ascending: true });
    if (error) alert(`Erro ao carregar mensagens: ${error.message}`);
    setMessages((data as Message[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!activeContact) return;
    void fetchMessages(activeContact);
    const channel = supabase.channel(`messages:${activeContact.id}:${userId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
      const message = payload.new as Message;
      if ((message.sender_id === userId && message.receiver_id === activeContact.id) || (message.sender_id === activeContact.id && message.receiver_id === userId)) {
        setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      }
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [activeContact, userId]);

  const selectContact = (contact: Contact) => { setActiveContact(contact); setExpanded(true); };

  const sendMessage = async () => {
    if (!userId || !activeContact?.id || !messageText.trim() || sending) return;
    setSending(true);
    const { data, error } = await (supabase.from("messages") as any).insert({ sender_id: userId, receiver_id: activeContact.id, content: messageText.trim(), media_url: null }).select("id, sender_id, receiver_id, content, media_url, created_at").single();
    if (error) alert(`Erro ao enviar mensagem: ${error.message}`);
    else if (data) setMessages((current) => current.some((item) => item.id === data.id) ? current : [...current, data as Message]);
    setMessageText("");
    setSending(false);
  };

  const sendMedia = async (file: File | undefined) => {
    if (!file || !userId || !activeContact?.id || sending) return;
    if (file.size > MAX_MEDIA_BYTES) { alert("O arquivo precisa ter no máximo 2 MB."); return; }
    const allowed = file.type.startsWith("image/") || file.type.startsWith("video/") || file.type === "application/pdf" || file.type.includes("document");
    if (!allowed) { alert("Envie uma imagem, vídeo ou documento PDF/DOC válido."); return; }
    setSending(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `${userId}/dm-${crypto.randomUUID()}.${extension}`;
      const upload = await supabase.storage.from("post-media").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (upload.error) throw upload.error;
      const { data: publicUrl } = supabase.storage.from("post-media").getPublicUrl(path);
      const { data, error } = await (supabase.from("messages") as any).insert({ sender_id: userId, receiver_id: activeContact.id, content: file.name, media_url: publicUrl.publicUrl }).select("id, sender_id, receiver_id, content, media_url, created_at").single();
      if (error) throw error;
      if (data) setMessages((current) => [...current, data as Message]);
    } catch (error) { alert(`Erro ao enviar anexo: ${error instanceof Error ? error.message : "erro desconhecido"}`); }
    finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const contactList = useMemo(() => contacts, [contacts]);

  return (
    <div className={`fixed bottom-0 right-4 z-50 w-80 overflow-hidden rounded-t-2xl border border-border bg-background shadow-2xl transition-all ${expanded ? "h-[450px]" : "h-14"}`}>
      <button type="button" onClick={() => setExpanded((value) => !value)} className="flex h-14 w-full items-center justify-between border-b border-border px-4 text-left hover:bg-accent/40">
        <span className="flex items-center gap-2 text-sm font-bold"><MessageCircle className="h-4 w-4 text-signal" />Mensagens</span>
        {expanded && <X className="h-4 w-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="flex h-[calc(100%-3.5rem)] flex-col">
          {!activeContact ? (
            <div className="space-y-1 overflow-y-auto p-3">
              {contactList.map((contact) => (
                <button key={contact.username} type="button" onClick={() => selectContact(contact)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-accent/40">
                  <span className="relative"><Avatar name={contact.name} src={contact.avatar} size={38} /><span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 animate-pulse rounded-full border-2 border-background bg-emerald-500" /></span>
                  <span><strong className="block text-sm">{contact.name}</strong><span className="text-xs text-emerald-500">Online</span></span>
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-border p-3"><button type="button" onClick={() => setActiveContact(null)} className="text-xs text-muted-foreground hover:text-foreground">Voltar</button><Avatar name={activeContact.name} src={activeContact.avatar} size={30} /><strong className="text-sm">{activeContact.name}</strong></div>
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {loading && <p className="text-center text-xs text-muted-foreground">Carregando mensagens...</p>}
                {messages.map((message) => {
                  const mine = message.sender_id === userId;
                  return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${mine ? "bg-signal text-signal-foreground" : "bg-muted text-foreground"}`}>{message.media_url && (isDocument(message.media_url) ? <a href={message.media_url} target="_blank" rel="noreferrer" className="mb-1 flex items-center gap-2 underline"><FileText className="h-4 w-4" />{message.content}</a> : isVideo(message.media_url) ? <video src={message.media_url} controls className="mb-1 max-h-32 rounded-lg" /> : <img src={message.media_url} alt={message.content ?? "Anexo"} className="mb-1 max-h-32 rounded-lg object-cover" />)}{message.content && !message.media_url && <span>{message.content}</span>}</div></div>;
                })}
              </div>
              <div className="flex items-center gap-1.5 border-t border-border p-2">
                <input ref={fileInputRef} type="file" accept="image/*,video/*,application/pdf,.doc,.docx" className="hidden" onChange={(event) => void sendMedia(event.target.files?.[0])} />
                <input ref={cameraInputRef} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(event) => void sendMedia(event.target.files?.[0])} />
                <button type="button" onClick={() => cameraInputRef.current?.click()} className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Tirar foto ou vídeo">
                  <Camera className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Anexar imagem ou documento">
                  <Paperclip className="h-4 w-4" />
                </button>
                <input value={messageText} onChange={(event) => setMessageText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void sendMessage(); }} placeholder="Mensagem..." className="min-w-0 flex-1 rounded-xl border border-border bg-background px-2.5 py-2 text-xs outline-none focus:border-signal" />
                <button type="button" onClick={() => void sendMessage()} disabled={sending || !messageText.trim()} className="shrink-0 rounded-lg bg-foreground p-2 text-background transition-opacity hover:opacity-90 disabled:opacity-40" aria-label="Enviar mensagem">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
