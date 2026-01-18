import { useState, useCallback, useEffect } from "react";
import * as commands from "../api/commands";
import type { ServerStatus } from "../types/tuio";

export interface UseWebSocketServerProps {
  initialPort?: number;
  initialFps?: number;
}

export interface UseWebSocketServer {
  isRunning: boolean;
  port: number;
  connectedClients: number;
  frameCount: number;
  fps: number;
  objectCount: number;
  startServer: (port: number) => Promise<void>;
  stopServer: () => Promise<void>;
  setFps: (fps: number) => Promise<void>;
  refreshStatus: () => Promise<void>;
}

/**
 * Hook for managing WebSocket server state
 *
 * Provides methods for starting/stopping the server and managing FPS
 */
export function useWebSocketServer({
  initialPort = 3333,
  initialFps = 60
}: UseWebSocketServerProps = {}): UseWebSocketServer {
  const [status, setStatus] = useState<ServerStatus>({
    running: false,
    port: initialPort,
    fps: initialFps,
    connected_clients: 0,
    frame_count: 0,
    object_count: 0,
  });

  const refreshStatus = useCallback(async () => {
    const newStatus = await commands.getServerStatus();
    setStatus(newStatus);
  }, []);

  const startServer = useCallback(
    async (port: number) => {
      await commands.startServer(port);
      await refreshStatus();
    },
    [refreshStatus]
  );

  const stopServer = useCallback(async () => {
    await commands.stopServer();
    await refreshStatus();
  }, [refreshStatus]);

  const setFps = useCallback(
    async (fps: number) => {
      await commands.setFrameRate(fps);
      await refreshStatus();
    },
    [refreshStatus]
  );

  // Poll status periodically when server is running
  useEffect(() => {
    if (!status.running) return;

    const interval = setInterval(refreshStatus, 1000);
    return () => clearInterval(interval);
  }, [status.running, refreshStatus]);

  return {
    isRunning: status.running,
    port: status.port,
    connectedClients: status.connected_clients,
    frameCount: status.frame_count,
    fps: status.fps,
    objectCount: status.object_count,
    startServer,
    stopServer,
    setFps,
    refreshStatus,
  };
}
