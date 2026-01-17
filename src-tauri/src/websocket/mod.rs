use anyhow::Result;
use futures_util::{SinkExt, StreamExt};
use parking_lot::Mutex;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::broadcast;
use tokio::task::JoinHandle;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::WebSocketStream;

pub type BroadcastSender = broadcast::Sender<Vec<u8>>;
pub type BroadcastReceiver = broadcast::Receiver<Vec<u8>>;

/// WebSocket server state
pub struct WebSocketServer {
    broadcast_tx: BroadcastSender,
    connected_clients: Arc<Mutex<usize>>,
    server_task: Arc<Mutex<Option<JoinHandle<()>>>>,
}

impl WebSocketServer {
    /// Create a new WebSocket server
    pub fn new() -> Self {
        // Create broadcast channel for sending messages to all clients
        // Buffer size of 100 messages
        let (broadcast_tx, _) = broadcast::channel(100);

        Self {
            broadcast_tx,
            connected_clients: Arc::new(Mutex::new(0)),
            server_task: Arc::new(Mutex::new(None)),
        }
    }

    /// Get the broadcast sender for sending messages to all clients
    pub fn get_broadcaster(&self) -> BroadcastSender {
        self.broadcast_tx.clone()
    }

    /// Get the current number of connected clients
    pub fn get_connected_clients(&self) -> usize {
        *self.connected_clients.lock()
    }

    /// Start the WebSocket server on the specified port
    ///
    /// This function spawns a tokio task that listens for incoming connections
    /// and handles them asynchronously.
    pub async fn start(
        &self,
        port: u16,
    ) -> Result<()> {
        // Stop any existing server first
        self.stop().await;

        let addr: SocketAddr = format!("127.0.0.1:{}", port).parse()?;
        let listener = TcpListener::bind(&addr).await?;

        println!("WebSocket server listening on: {}", addr);

        let broadcast_tx = self.broadcast_tx.clone();
        let connected_clients = self.connected_clients.clone();

        // Spawn task to accept connections
        let task = tokio::spawn(async move {
            loop {
                match listener.accept().await {
                    Ok((stream, addr)) => {
                        println!("New WebSocket connection from: {}", addr);

                        // Increment connected clients
                        {
                            let mut count = connected_clients.lock();
                            *count += 1;
                        }

                        let broadcast_rx = broadcast_tx.subscribe();
                        let clients = connected_clients.clone();

                        // Spawn task to handle this client
                        tokio::spawn(async move {
                            if let Err(e) = handle_connection(stream, broadcast_rx).await {
                                eprintln!("Error handling connection from {}: {}", addr, e);
                            }

                            // Decrement connected clients on disconnect
                            {
                                let mut count = clients.lock();
                                *count = count.saturating_sub(1);
                            }

                            println!("Client disconnected: {}", addr);
                        });
                    }
                    Err(e) => {
                        eprintln!("Error accepting connection: {}", e);
                        break;
                    }
                }
            }
        });

        // Store task handle
        {
            let mut server_task = self.server_task.lock();
            *server_task = Some(task);
        }

        Ok(())
    }

    /// Stop the WebSocket server
    pub async fn stop(&self) {
        let mut server_task = self.server_task.lock();
        if let Some(task) = server_task.take() {
            task.abort();
            println!("WebSocket server stopped");
        }

        // Reset connected clients count
        {
            let mut count = self.connected_clients.lock();
            *count = 0;
        }
    }

    /// Broadcast binary data to all connected clients
    pub async fn broadcast(&self, data: Vec<u8>) -> Result<()> {
        // Send returns the number of receivers that received the message
        // We don't need to check the result as it's ok if there are no receivers
        let _ = self.broadcast_tx.send(data);
        Ok(())
    }
}

impl Default for WebSocketServer {
    fn default() -> Self {
        Self::new()
    }
}

/// Handle a single WebSocket connection
///
/// This function:
/// 1. Upgrades the TCP connection to WebSocket
/// 2. Listens for broadcast messages
/// 3. Sends broadcast messages to the client
/// 4. Handles client disconnection
async fn handle_connection(
    stream: TcpStream,
    mut broadcast_rx: BroadcastReceiver,
) -> Result<()> {
    // Upgrade to WebSocket
    let ws_stream: WebSocketStream<TcpStream> =
        tokio_tungstenite::accept_async(stream).await?;

    let (mut ws_sender, mut ws_receiver) = ws_stream.split();

    // Spawn task to receive messages from client (we don't expect any, but need to handle them)
    let receive_task = tokio::spawn(async move {
        while let Some(msg) = ws_receiver.next().await {
            match msg {
                Ok(Message::Close(_)) => {
                    break;
                }
                Ok(Message::Ping(data)) => {
                    // Pongs are handled automatically by tungstenite
                    println!("Received ping: {:?}", data);
                }
                Ok(_) => {
                    // Ignore other messages
                }
                Err(e) => {
                    eprintln!("WebSocket receive error: {}", e);
                    break;
                }
            }
        }
    });

    // Main loop: receive from broadcast and send to client
    loop {
        match broadcast_rx.recv().await {
            Ok(data) => {
                // Send binary message to client
                if let Err(e) = ws_sender.send(Message::Binary(data)).await {
                    eprintln!("Error sending to client: {}", e);
                    break;
                }
            }
            Err(broadcast::error::RecvError::Lagged(skipped)) => {
                eprintln!("Client lagged, skipped {} messages", skipped);
                // Continue anyway
            }
            Err(broadcast::error::RecvError::Closed) => {
                // Broadcast channel closed, exit
                break;
            }
        }
    }

    // Wait for receive task to complete
    let _ = receive_task.await;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_websocket_server_creation() {
        let server = WebSocketServer::new();
        assert_eq!(server.get_connected_clients(), 0);
    }

    #[test]
    fn test_get_broadcaster() {
        let server = WebSocketServer::new();
        let broadcaster = server.get_broadcaster();

        // Should be able to send messages
        // When there are no receivers, send returns Err(SendError)
        // This is expected behavior
        let result = broadcaster.send(vec![1, 2, 3]);
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_broadcast() {
        let server = WebSocketServer::new();
        let result = server.broadcast(vec![1, 2, 3]).await;
        assert!(result.is_ok());
    }
}
