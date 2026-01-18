import React from 'react';

interface Token {
  componentId: number;
  name: string;
  color: string;
}

interface TokenPaletteProps {
  activeTokens: Set<number>;
  onTokenDragStart: (componentId: number) => void;
  onTokenReturn: (componentId: number) => void;
}

// Generate 24 unique tokens
const generateTokens = (): Token[] => {
  const tokens: Token[] = [];
  for (let i = 1; i <= 24; i++) {
    // Use HSL color scheme for visual distinction
    const hue = ((i - 1) * 137) % 360;
    tokens.push({
      componentId: i,
      name: `Token ${i}`,
      color: `hsl(${hue}, 70%, 50%)`,
    });
  }
  return tokens;
};

const TOKENS = generateTokens();

export const TokenPalette: React.FC<TokenPaletteProps> = ({
  activeTokens,
  onTokenDragStart,
  onTokenReturn,
}) => {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, componentId: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('componentId', componentId.toString());
    onTokenDragStart(componentId);
  };

  const handleReturnToken = (componentId: number) => {
    onTokenReturn(componentId);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Token Repository</h3>
        <span className="text-xs text-gray-400">
          {activeTokens.size}/24 active
        </span>
      </div>

      <div className="text-xs text-gray-400 mb-2">
        Drag tokens to canvas to activate them
      </div>

      <div className="grid grid-cols-4 gap-2 max-h-96 overflow-y-auto p-1">
        {TOKENS.map((token) => {
          const isActive = activeTokens.has(token.componentId);

          return (
            <div
              key={token.componentId}
              draggable={!isActive}
              onDragStart={(e) => handleDragStart(e, token.componentId)}
              onClick={() => isActive && handleReturnToken(token.componentId)}
              className={`
                relative aspect-square rounded-lg border-2 flex flex-col items-center justify-center
                cursor-pointer transition-all select-none
                ${isActive
                  ? 'opacity-30 border-gray-600 cursor-not-allowed'
                  : 'border-gray-500 hover:border-white hover:scale-105 active:scale-95'
                }
              `}
              style={{
                backgroundColor: isActive ? '#1a1a1a' : token.color,
              }}
              title={isActive ? `${token.name} (On canvas - click to return)` : `Drag ${token.name} to canvas`}
            >
              <div className="text-lg font-bold text-white drop-shadow-md">
                {token.componentId}
              </div>
              {isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                  <div className="text-xs text-white">Active</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-800 rounded">
        <div className="font-semibold mb-1">Component IDs 1-24</div>
        <div>• Drag to canvas to activate</div>
        <div>• Click active token to return</div>
        <div>• Each token can only be used once</div>
      </div>
    </div>
  );
};
