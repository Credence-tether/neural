import { api } from "@/convex/_generated/api.js";
import { useAction } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type NotificationStatus =
  | "unsupported"
  | "iframe"
  | "denied"
  | "loading"
  | "subscribed"
  | "unsubscribed";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function usePushNotifications(isAuthenticated?: boolean) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const getVapidPublicKey = useAction(api.pushNotifications.getVapidPublicKey);
  const registerSubscription = useAction(api.pushNotifications.subscribe);
  const removeSubscription = useAction(api.pushNotifications.unsubscribe);

  useEffect(() => {
    if ("Notification" in window) setPermission(Notification.permission);
    if (!isAuthenticated || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready.then(async (registration) => {
      const existing = await registration.pushManager.getSubscription();
      setIsSubscribed(!!existing);
    });
  }, [isAuthenticated]);

  const status: NotificationStatus = useMemo(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
    if (isInIframe()) return "iframe";
    if (permission === "denied") return "denied";
    if (isLoading) return "loading";
    if (isSubscribed) return "subscribed";
    return "unsubscribed";
  }, [permission, isLoading, isSubscribed]);

  const subscribe = useCallback(async () => {
    if (status === "unsupported" || status === "iframe" || status === "denied") {
      return { error: `Cannot subscribe: ${status}` };
    }
    setIsLoading(true);
    try {
      const { vapidPublicKey } = await getVapidPublicKey();
      if (!vapidPublicKey) return { error: "Failed to get VAPID public key" };

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return { permission: "denied" };

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      await registerSubscription({ subscription: JSON.stringify(subscription) });

      setIsSubscribed(true);
      return { permission: "granted", subscribed: true };
    } catch (error) {
      toast.error("Failed to enable push notifications.");
      return { error: String(error) };
    } finally {
      setIsLoading(false);
    }
  }, [status, getVapidPublicKey, registerSubscription]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await removeSubscription({ endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
      return { success: true };
    } catch (error) {
      return { error: String(error) };
    } finally {
      setIsLoading(false);
    }
  }, [removeSubscription]);

  return { status, subscribe, unsubscribe };
}
