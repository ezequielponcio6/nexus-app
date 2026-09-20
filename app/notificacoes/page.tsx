"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Heart, MessageCircle, Bell } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { createClient } from "@/lib/supabase/client";

type NotificationKind = "like" | "comment" | "tip";

type NotificationItem = {
  id: string;
  kind: NotificationKind;
  actor: string;
  avatar: string;
  message: string;
  postId: string;
  createdAt: string;
  read: boolean;
};

const notificationSeed: NotificationItem[] = [
  {
    id: "like-filipe",
    kind: "like",
    actor: "Filipe",
    avatar: "https://i.pravatar.cc/96?img=11",
    message: "curtiu sua publicação",
    postId: "demo-like-post",
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: "comment-luna",
    kind: "comment",
    actor: "Luna Vale",
    avatar: "https://i.pravatar.cc/96?img=47",
    message: "comentou no seu post do Buquê",
    postId: "demo-buque-post",
    createdAt: new Date(Date.now() - 58 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: "tip-rafael",
    kind: "tip",
    actor: "Rafael Diniz",
    avatar: "https://i.pravatar.cc/96?img=12",
    message: "enviou uma gorjeta de 10 NX$",
    postId: "demo-tip-post",
    createdAt: new Date(Date.now() - 3 * 86400 * 1000).toISOString(),
    read: false,
  },
];

const iconByKind = {
  like: Heart,
  comment: MessageCircle,
  tip: Coins,
};

const colorByKind = {
  like: "bg-rose-500/10 text-rose-500",
  comment: "bg-signal/10 text-signal",
  tip: "bg-amber-500/10 text-amber-500",
};

export default function NotificacoesPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>(notificationSeed);

  useEffect(() => {
    const loadNotifications = async () => {
      let loadedNotifications = notificationSeed;
      const stored = localStorage.getItem("nexus_notifications");

      if (stored) {
        try {
          loadedNotifications = JSON.parse(stored) as NotificationItem[];
        } catch {
          loadedNotifications = notificationSeed;
        }
      }

      const supabase = createClient();
      const { data: recentPosts } = await (supabase.from("posts") as any)
        .select("id")
        .order("created_at", { ascending: false })
        .limit(3);

      if (recentPosts?.length) {
        loadedNotifications = loadedNotifications.map((notification, index) => ({
          ...notification,
          postId: recentPosts[index]?.id ?? notification.postId,
        }));
      }

      setNotifications(loadedNotifications);
      localStorage.setItem("nexus_notifications", JSON.stringify(loadedNotifications));
      localStorage.setItem("nexus_notifications_unread", "0");
      window.dispatchEvent(new StorageEvent("storage", { key: "nexus_notifications_unread", newValue: "0" }));
    };

    void loadNotifications();
  }, []);

  function markAllRead() {
    const next = notifications.map((notification) => ({ ...notification, read: true }));
    setNotifications(next);
    localStorage.setItem("nexus_notifications", JSON.stringify(next));
    localStorage.setItem("nexus_notifications_unread", "0");
    window.dispatchEvent(new StorageEvent("storage", { key: "nexus_notifications_unread", newValue: "0" }));
  }

  function openNotification(notification: NotificationItem) {
    const next = notifications.map((item) => item.id === notification.id ? { ...item, read: true } : item);
    setNotifications(next);
    localStorage.setItem("nexus_notifications", JSON.stringify(next));
    router.push(`/feed?openPost=${encodeURIComponent(notification.postId)}`);
  }

  return (
    <AppShell activePath="/notificacoes">
      <div className="mx-auto w-full max-w-2xl space-y-6 pb-12">
        <header className="flex items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-signal/10 p-2.5 text-signal"><Bell className="h-5 w-5" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-signal">Central Nexus</p>
              <h1 className="mt-1 text-2xl font-black text-foreground">Notificações</h1>
            </div>
          </div>
          <button type="button" onClick={markAllRead} className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground">Marcar como lidas</button>
        </header>

        <section className="space-y-2">
          {notifications.map((notification) => {
            const Icon = iconByKind[notification.kind];
            return (
              <article
                key={notification.id}
                onClick={() => openNotification(notification)}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-colors hover:bg-accent/40 ${notification.read ? "border-border bg-card" : "border-signal/20 bg-signal/5"}`}
              >
                <div className="relative shrink-0">
                  <Avatar name={notification.actor} src={notification.avatar} size={44} />
                  <span className={`absolute -bottom-1 -right-1 rounded-full p-1.5 ${colorByKind[notification.kind]}`}><Icon className="h-3.5 w-3.5" /></span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-6 text-foreground"><strong>{notification.actor}</strong> {notification.message}</p>
                  <time className="text-xs text-muted-foreground">{formatRelativeTime(notification.createdAt)}</time>
                </div>
                {!notification.read && <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" aria-label="Não lida" />}
              </article>
            );
          })}
        </section>
      </div>
    </AppShell>
  );
}
