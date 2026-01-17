import { useEffect } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export interface ClientConnectedEvent {
  client_id: string;
}

export interface ClientDisconnectedEvent {
  client_id: string;
}

export interface FrameSentEvent {
  frame_id: number;
  object_count: number;
}

export interface ServerStatusEvent {
  running: boolean;
  connected_clients: number;
}

export interface TauriEventHandlers {
  onClientConnected?: (event: ClientConnectedEvent) => void;
  onClientDisconnected?: (event: ClientDisconnectedEvent) => void;
  onFrameSent?: (event: FrameSentEvent) => void;
  onServerStatus?: (event: ServerStatusEvent) => void;
}

/**
 * Hook for listening to Tauri events from the backend
 *
 * Automatically subscribes to events on mount and unsubscribes on unmount
 */
export function useTauriEvents(handlers: TauriEventHandlers) {
  useEffect(() => {
    const unlisteners: UnlistenFn[] = [];

    const setupListeners = async () => {
      if (handlers.onClientConnected) {
        const unlisten = await listen<ClientConnectedEvent>(
          "client_connected",
          (event) => {
            handlers.onClientConnected?.(event.payload);
          }
        );
        unlisteners.push(unlisten);
      }

      if (handlers.onClientDisconnected) {
        const unlisten = await listen<ClientDisconnectedEvent>(
          "client_disconnected",
          (event) => {
            handlers.onClientDisconnected?.(event.payload);
          }
        );
        unlisteners.push(unlisten);
      }

      if (handlers.onFrameSent) {
        const unlisten = await listen<FrameSentEvent>("frame_sent", (event) => {
          handlers.onFrameSent?.(event.payload);
        });
        unlisteners.push(unlisten);
      }

      if (handlers.onServerStatus) {
        const unlisten = await listen<ServerStatusEvent>(
          "server_status",
          (event) => {
            handlers.onServerStatus?.(event.payload);
          }
        );
        unlisteners.push(unlisten);
      }
    };

    setupListeners();

    return () => {
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, [handlers]);
}
