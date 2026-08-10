interface ManhattenLineProps {
  source: { x: number; y: number; type: string };
  target: { x: number; y: number; type: string };
  port: number;
}

export function ManhattenLine({ source, target, port }: ManhattenLineProps) {
  const ICON_SIZE = 40;
  const HALF = ICON_SIZE / 2; // 20 — radius of icon

  // Center of icons
  const cx1 = source.x + HALF;
  const cy1 = source.y + HALF;
  const cx2 = target.x + HALF;
  const cy2 = target.y + HALF;

  // Direction from source to target
  const dx = cx2 - cx1;
  const dy = cy2 - cy1;

  // Start point: edge of source icon
  let x1: number, y1: number;
  // End point: edge of target icon
  let x2: number, y2: number;

  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal dominant
    x1 = dx > 0 ? cx1 + HALF : cx1 - HALF;
    y1 = cy1;
    x2 = dx > 0 ? cx2 - HALF : cx2 + HALF;
    y2 = cy2;
  } else {
    // Vertical dominant
    x1 = cx1;
    y1 = dy > 0 ? cy1 + HALF : cy1 - HALF;
    x2 = cx2;
    y2 = dy > 0 ? cy2 - HALF : cy2 + HALF;
  }

  // Manhattan path with edge points
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  let path = "";
  if (Math.abs(dx) > Math.abs(dy)) {
    path = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
  } else {
    path = `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
  }

  return (
    <g>
      <path d={path} fill="none" stroke="#3b82f6" strokeWidth="1.5" />
      {/* Port label at midpoint */}
      <circle cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} r="9" fill="#1e293b" stroke="#3b82f6" strokeWidth="1" />
      <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 + 3} textAnchor="middle" fill="#94a3b8" fontSize="8">
        :{port}
      </text>
    </g>
  );
}