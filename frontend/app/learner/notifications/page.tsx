"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, BookOpen, Mic2, CheckCircle, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function NotificationsPage() {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/notifications`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );

        if (res.ok) {
          const data = await res.json();
          setNotifications(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to load notifications:", err);
      }
    };

    fetchNotifications();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch {
      alert(t('notifications.deleteError'));
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/${id}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/mark-all`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      alert(t('notifications.markAllReadError'));
    }
  };

  const getIconComponent = (iconType: string) => {
    switch (iconType) {
      case "quiz":
        return <Bell className="w-4 h-4 text-primary" />;
      case "material":
        return <BookOpen className="w-4 h-4 text-primary" />;
      case "oral":
        return <Mic2 className="w-4 h-4 text-primary" />;
      case "result":
        return <CheckCircle className="w-4 h-4 text-primary" />;
      default:
        return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">{t('notifications.title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : t('notifications.subtitle')}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllAsRead} variant="outline" size="sm" className="text-xs h-8 self-start sm:self-auto">
            {t('notifications.markAllRead')}
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {notifications.length > 0 ? (
        <Card className="border border-border bg-card shadow-xs">
          <div className="divide-y divide-border">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={`p-4 transition-colors ${
                  !notification.read
                    ? "bg-secondary/25"
                    : "bg-card"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="shrink-0 mt-0.5 p-2 rounded-md bg-primary/10">
                    {getIconComponent(notification.icon)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-xs font-semibold text-foreground">
                          {notification.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">
                          {notification.timestamp || new Date(notification.createdAt || Date.now()).toLocaleString()}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {!notification.read && (
                      <Button
                        onClick={() => handleMarkAsRead(notification._id)}
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px] px-2"
                      >
                        {t('notifications.markAsRead')}
                      </Button>
                    )}
                    <Button
                      onClick={() => handleDelete(notification._id)}
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      aria-label={t('notifications.delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="border border-border p-8 bg-card shadow-xs">
          <div className="text-center py-6">
            <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-60" />
            <p className="text-xs text-muted-foreground">{t('notifications.noNotifications')}</p>
          </div>
        </Card>
      )}
    </div>
  );
}
