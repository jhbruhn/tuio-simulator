export interface TuioObject {
  session_id: number;
  type_id: number;
  user_id: number;
  component_id: number;
  x: number;
  y: number;
  angle: number;
  x_vel: number;
  y_vel: number;
  angle_vel: number;
  last_x: number;
  last_y: number;
  last_angle: number;
  last_update: number;
}

export interface Config {
  port: number;
  fps: number;
  width: number;
  height: number;
  source: string;
}

export interface ServerStatus {
  running: boolean;
  port: number;
  fps: number;
  connected_clients: number;
  frame_count: number;
  object_count: number;
}
