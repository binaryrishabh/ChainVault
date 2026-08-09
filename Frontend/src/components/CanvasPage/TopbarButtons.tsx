interface TopbarButtonProps {
  icon: string;
  label: string;
  onclick?: () => void;
  variant?: "new" | "save" | "update" | "deploy" | "delete" | "default";
}

export function TopbarButton({ icon, label, onclick, variant = "default" }: TopbarButtonProps) {
  const isDisabled = !onclick;
  
  const baseStyles = "px-3 py-1.5 rounded-md text-xs font-medium transition-colors";
  const cursorStyles = isDisabled 
    ? "cursor-not-allowed opacity-40" 
    : "cursor-pointer";
  
  const variableStyles = {
    new: "bg-gray-800 hover:bg-green-700 text-gray-300",
    save: "bg-gray-600 hover:bg-blue-500 text-white",
    update: "bg-gray-600 hover:bg-yellow-500 text-white",
    deploy: "bg-gray-600 hover:bg-green-500 text-white",
    delete: "bg-gray-700 hover:bg-red-600 text-gray-200",
    default: "bg-gray-700 hover:bg-gray-600 text-gray-200"
  };
  
  return (
    <button 
      className={`${baseStyles} ${cursorStyles} ${variableStyles[variant]}`} 
      onClick={onclick}
      disabled={isDisabled}
    >
      {icon} {label}
    </button>
  );
}