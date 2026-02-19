// components/kanban/column-filter-icons.tsx
import { AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ColumnFilterIconsProps {
  onFilterOverdue: () => void;
  onFilterUpcoming: () => void;
  isOverdueActive: boolean;
  isUpcomingActive: boolean;
  disabled?: boolean;
}

export function ColumnFilterIcons({
  onFilterOverdue,
  onFilterUpcoming,
  isOverdueActive,
  isUpcomingActive,
  disabled = false,
}: ColumnFilterIconsProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-0.5 mr-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-5 w-5 text-white/80 hover:text-white hover:bg-white/10 ${
                isOverdueActive ? "bg-red-500/30 text-white" : ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onFilterOverdue();
              }}
              disabled={disabled}
            >
              <AlertTriangle className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p>Filtrar itens atrasados</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-5 w-5 text-white/80 hover:text-white hover:bg-white/10 ${
                isUpcomingActive ? "bg-amber-500/30 text-white" : ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onFilterUpcoming();
              }}
              disabled={disabled}
            >
              <Clock className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p>Filtrar itens próximos a vencer (hoje)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}