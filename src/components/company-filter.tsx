"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Building2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/services/api";

interface Company {
  id: string;
  name: string;
  cnpj: string;
}

interface CompanyFilterProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
}

export function CompanyFilter({ value, onChange, disabled }: CompanyFilterProps) {
  const [open, setOpen] = React.useState(false);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Busca as empresas ao montar o componente
  React.useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        // Ajuste o endpoint conforme sua API (ex: paginação ou busca simples)
        const { data } = await api.get<{ data: Company[] }>("/companies?limit=100");
        setCompanies(data.data || []);
      } catch (error) {
        console.error("Erro ao buscar empresas", error);
      } finally {
        setLoading(false);
      }
    };

    if (!disabled) {
      fetchCompanies();
    }
  }, [disabled]);

  const selectedCompany = companies.find((c) => c.id === value);

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-[250px] justify-between border-[#95A5A6]/30 bg-white text-[#2D3436]"
          >
            {selectedCompany ? (
              <span className="truncate flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#D35400]" />
                {selectedCompany.name}
              </span>
            ) : (
              <span className="text-[#95A5A6]">Filtrar por empresa...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0">
          <Command>
            <CommandInput placeholder="Buscar empresa..." />
            <CommandList>
              <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
              <CommandGroup>
                {loading ? (
                  <div className="p-2 text-sm text-center text-gray-500">Carregando...</div>
                ) : (
                  companies.map((company) => (
                    <CommandItem
                      key={company.id}
                      value={company.name} // O valor de busca do Command é pelo nome visual
                      onSelect={() => {
                        onChange(company.id === value ? undefined : company.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === company.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span>{company.name}</span>
                        <span className="text-[10px] text-gray-400">{company.cnpj}</span>
                      </div>
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Botão de Limpar Filtro */}
      {value && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange(undefined)}
          className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50"
          title="Limpar filtro de empresa"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}