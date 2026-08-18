interface CanvasResourcePortsProps {
  isConnecting: boolean;
}

export function CanvasResourcePorts({ isConnecting }: CanvasResourcePortsProps) {
  if (!isConnecting) return null;

  return (
    <>
      {/* Top port */}
      <div
        className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Port"
      />
      {/* Right port */}
      <div
        className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Port"
      />
      {/* Bottom port */}
      <div
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Port"
      />
      {/* Left port */}
      <div
        className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Port"
      />
    </>
  );
}