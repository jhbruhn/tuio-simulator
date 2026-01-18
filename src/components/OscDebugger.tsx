import React, { useState, useEffect, useRef } from 'react';

interface OscMessage {
  frame_id: number;
  timestamp: number;
  object_count: number;
  message_size: number;
  connected_clients: number;
}

interface OscDebuggerProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const OscDebugger: React.FC<OscDebuggerProps> = ({ isOpen, onToggle }) => {
  const [messages, setMessages] = useState<OscMessage[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState('');
  const [maxMessages, setMaxMessages] = useState(100);
  const [height, setHeight] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState({
    avgFps: 0,
    avgSize: 0,
    totalMessages: 0,
  });

  useEffect(() => {
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<OscMessage>('osc_message', (event) => {
        if (!isPaused) {
          const msg = event.payload;
          setMessages((prev) => {
            const newMessages = [...prev, msg].slice(-maxMessages);

            // Calculate stats
            if (newMessages.length > 1) {
              const timeDiffs = [];
              for (let i = 1; i < newMessages.length; i++) {
                timeDiffs.push(newMessages[i].timestamp - newMessages[i - 1].timestamp);
              }
              const avgTimeDiff = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
              const avgFps = avgTimeDiff > 0 ? Math.round(1000 / avgTimeDiff) : 0;
              const avgSize = Math.round(
                newMessages.reduce((sum, m) => sum + m.message_size, 0) / newMessages.length
              );

              setStats({
                avgFps,
                avgSize,
                totalMessages: prev.length + 1,
              });
            }

            return newMessages;
          });
        }
      }).then((unlisten) => {
        return unlisten;
      });
    });
  }, [isPaused, maxMessages]);

  useEffect(() => {
    if (!isPaused) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isPaused]);

  // Handle resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newHeight = window.innerHeight - e.clientY;
        setHeight(Math.max(150, Math.min(600, newHeight)));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  const filteredMessages = messages.filter((msg) =>
    filter === '' ||
    msg.frame_id.toString().includes(filter) ||
    msg.object_count.toString().includes(filter)
  );

  const handleClear = () => {
    setMessages([]);
    setStats({ avgFps: 0, avgSize: 0, totalMessages: 0 });
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <button
          onClick={onToggle}
          className="w-full bg-gray-800 hover:bg-gray-700 text-white py-2 text-sm font-medium border-t border-gray-700 transition-colors"
        >
          <div className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            <span>Open OSC Debugger</span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 flex flex-col z-40"
      style={{ height: `${height}px` }}
    >
      {/* Resize Handle */}
      <div
        className="h-1 bg-gray-700 hover:bg-blue-500 cursor-ns-resize transition-colors"
        onMouseDown={handleMouseDown}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold text-white">OSC Message Debugger</h2>
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded">
              {stats.avgFps} FPS
            </span>
            <span className="px-2 py-0.5 bg-green-600/20 text-green-400 rounded">
              ~{stats.avgSize} bytes
            </span>
            <span className="px-2 py-0.5 bg-purple-600/20 text-purple-400 rounded">
              {stats.totalMessages} total
            </span>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-white"
          title="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-700">
        <button
          onClick={() => setIsPaused(!isPaused)}
          className={`px-3 py-1 rounded text-xs font-medium ${
            isPaused
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-yellow-600 hover:bg-yellow-700'
          }`}
        >
          {isPaused ? '▶ Resume' : '⏸ Pause'}
        </button>

        <button
          onClick={handleClear}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs font-medium"
        >
          Clear
        </button>

        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by frame ID or object count..."
          className="flex-1 px-3 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-white placeholder-gray-400"
        />

        <select
          value={maxMessages}
          onChange={(e) => setMaxMessages(Number(e.target.value))}
          className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-white"
        >
          <option value={50}>Keep 50</option>
          <option value={100}>Keep 100</option>
          <option value={200}>Keep 200</option>
          <option value={500}>Keep 500</option>
        </select>
      </div>

      {/* Messages Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-900 sticky top-0">
            <tr className="text-left text-gray-400">
              <th className="px-4 py-1.5 font-medium">Frame ID</th>
              <th className="px-4 py-1.5 font-medium">Timestamp</th>
              <th className="px-4 py-1.5 font-medium">Objects</th>
              <th className="px-4 py-1.5 font-medium">Size</th>
              <th className="px-4 py-1.5 font-medium">Clients</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            {filteredMessages.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  {messages.length === 0
                    ? 'No messages captured yet. Start the server to begin.'
                    : 'No messages match the filter.'}
                </td>
              </tr>
            ) : (
              filteredMessages.map((msg, idx) => (
                <tr
                  key={`${msg.frame_id}-${idx}`}
                  className="border-t border-gray-700 hover:bg-gray-700/50"
                >
                  <td className="px-4 py-1.5 font-mono">{msg.frame_id}</td>
                  <td className="px-4 py-1.5 font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString()}.
                    {String(msg.timestamp % 1000).padStart(3, '0')}
                  </td>
                  <td className="px-4 py-1.5">
                    <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded">
                      {msg.object_count}
                    </span>
                  </td>
                  <td className="px-4 py-1.5 font-mono">{msg.message_size} B</td>
                  <td className="px-4 py-1.5">
                    <span className="px-2 py-0.5 bg-green-600/20 text-green-400 rounded">
                      {msg.connected_clients}
                    </span>
                  </td>
                </tr>
              ))
            )}
            <div ref={messagesEndRef} />
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="px-4 py-1.5 border-t border-gray-700 text-xs text-gray-400">
        Showing {filteredMessages.length} of {messages.length} messages
        {isPaused && <span className="ml-2 text-yellow-400">(Paused)</span>}
      </div>
    </div>
  );
};
