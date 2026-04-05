import { useEffect, useRef, useCallback } from 'react';

type EventCallback = (data: unknown) => void;

export function useSSE(slug: string | null) {
  const esRef = useRef<EventSource | null>(null);
  const listenersRef = useRef<Map<string, Set<EventCallback>>>(new Map());
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const on = useCallback((eventName: string, callback: EventCallback) => {
    if (!listenersRef.current.has(eventName)) {
      listenersRef.current.set(eventName, new Set());
    }
    listenersRef.current.get(eventName)!.add(callback);

    return () => {
      listenersRef.current.get(eventName)?.delete(callback);
    };
  }, []);

  const connect = useCallback(() => {
    if (!slug) return;

    const url = `/api/events/${slug}/stream`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('connected', () => {
      console.log(`SSE connected to ${slug}`);
    });

    // Generic event listener that dispatches to registered callbacks
    const genericListener = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        const callbacks = listenersRef.current.get(e.type);
        if (callbacks) {
          callbacks.forEach((cb) => cb(data));
        }
      } catch {
        // ignore parse errors
      }
    };

    const events = ['grid:updated', 'race:status', 'race:results'];
    events.forEach((evt) => es.addEventListener(evt, genericListener));

    es.onerror = () => {
      es.close();
      esRef.current = null;
      // Reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [slug, connect]);

  return { on };
}
