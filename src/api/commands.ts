import { invoke } from "@tauri-apps/api/core";
import type { ServerStatus } from "../types/tuio";

export async function startServer(port: number): Promise<void> {
  await invoke("start_server", { port });
}

export async function stopServer(): Promise<void> {
  await invoke("stop_server");
}

export async function addObject(
  typeId: number,
  x: number,
  y: number
): Promise<number> {
  return await invoke<number>("add_object", {
    typeId,
    x,
    y,
  });
}

export async function updateObject(
  sessionId: number,
  x: number,
  y: number,
  angle: number
): Promise<void> {
  await invoke("update_object", {
    sessionId,
    x,
    y,
    angle,
  });
}

export async function removeObject(sessionId: number): Promise<void> {
  await invoke("remove_object", { sessionId });
}

export async function setFrameRate(fps: number): Promise<void> {
  await invoke("set_frame_rate", { fps });
}

export async function getServerStatus(): Promise<ServerStatus> {
  return await invoke<ServerStatus>("get_server_status");
}

export async function setCanvasDimensions(
  width: number,
  height: number
): Promise<void> {
  await invoke("set_canvas_dimensions", { width, height });
}
