# TUIO 2.0 Test Client

A simple HTML/JavaScript test client for validating the TUIO simulator's WebSocket output.

## Features

- Real-time TUIO 2.0 message parsing
- Visual token representation on canvas
- Live statistics (active tokens, frame rate, message count)
- Detailed token information display
- Pure JavaScript implementation (no external dependencies)

## Usage

1. **Start the TUIO Simulator**
   - Run the main tuio-simulator application
   - Start the WebSocket server (default port: 3343)
   - Add some tokens to the canvas

2. **Open the Test Client**
   - Open `test-client/index.html` in a web browser
   - You can simply double-click the file or serve it with a local web server

3. **Connect to the Simulator**
   - Enter the host (default: localhost) and port (default: 3343)
   - Click "Connect"
   - You should see tokens appear on the canvas in real-time

## What It Tests

This test client validates:

- **WebSocket Connection**: Confirms the server accepts WebSocket connections
- **OSC Bundle Parsing**: Verifies OSC binary format is correctly encoded
- **TUIO 2.0 Protocol**: Tests FRM, TOK, and ALV message handling
- **Token Data**: Validates session IDs, component IDs, positions, and rotations
- **Real-time Updates**: Confirms tokens update smoothly at the configured FPS

## Expected Behavior

When connected to a running TUIO simulator:

- Tokens should appear at the same positions as in the simulator
- Token colors should match (generated from component ID)
- Rotation indicators should align with the simulator
- Token movements should be smooth and real-time
- Adding/removing tokens in the simulator should immediately reflect in the client

## Implementation Details

The test client implements a minimal TUIO 2.0 client using:

- **WebSocket API**: For binary communication
- **OSC Bundle Parser**: Manually parses OSC binary format
- **TUIO 2.0 Messages**: Handles /tuio2/frm, /tuio2/tok, and /tuio2/alv
- **Canvas Rendering**: Visualizes tokens with position and rotation

This provides validation that the TUIO simulator correctly implements the TUIO 2.0 protocol over WebSocket.

## Reference

Based on research of the tuio_client_js library and TUIO 2.0 specification:
- [tuio_client_js](https://github.com/InteractiveScapeGmbH/tuio_client_js) - TUIO 1.1 and 2.0 JavaScript client
- [TUIO Protocol](https://www.tuio.org/) - Official TUIO specification
