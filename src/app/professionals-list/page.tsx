"use client";
import { useEffect, useState } from "react";
import axios from "axios";

type Employee = {
  id: string;
  name: string;
  role: string;
  contact: string;
  createdAt: string;
  updatedAt: string;
};

export default function EmployeesTable() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await axios.get("http://localhost:3002/professionals");
        const data = Array.isArray(res.data) ? res.data : [];
        setEmployees(data);
      } catch (err) {
        console.error("Erro ao buscar funcionários:", err);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este funcionário?")) return;
    try {
      await axios.delete(`http://localhost:3002/professionals/${id}`);
      setEmployees((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error(err);
      alert("❌ Erro ao deletar funcionário.");
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-7xl bg-white rounded-3xl shadow-xl p-6 border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-semibold text-gray-800 tracking-tight">
            👩‍💼 Lista de Funcionários
          </h2>
          <button
            onClick={() => alert("Adicionar funcionário (recurso futuro)")}
            className="bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 text-white font-medium py-2 px-5 rounded-lg shadow transition-all"
          >
            + Novo Funcionário
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-blue-400 border-dashed rounded-full animate-spin"></div>
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-20 text-gray-500 italic">
            Nenhum funcionário encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="min-w-full border-collapse text-left">
              <thead className="bg-gray-100 text-gray-700 text-sm uppercase">
                <tr>
                  <th className="py-3 px-4 font-semibold">Nome</th>
                  <th className="py-3 px-4 font-semibold">Cargo</th>
                  <th className="py-3 px-4 font-semibold">Contato</th>
                  <th className="py-3 px-4 font-semibold">Criado em</th>
                  <th className="py-3 px-4 font-semibold">Atualizado em</th>
                  <th className="py-3 px-4 text-center font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, index) => (
                  <tr
                    key={emp.id}
                    className={`border-t text-gray-700 text-sm hover:bg-gray-50 transition ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                    }`}
                  >
                    <td className="py-3 px-4 font-medium">{emp.name}</td>
                    <td className="py-3 px-4">{emp.role}</td>
                    <td className="py-3 px-4">{emp.contact}</td>
                    <td className="py-3 px-4">
                      {new Date(emp.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-3 px-4">
                      {new Date(emp.updatedAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDelete(emp.id)}
                        className="bg-red-500 hover:bg-red-600 text-white py-1.5 px-3 rounded-lg text-sm font-medium shadow-sm transition-all"
                      >
                        🗑 Deletar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
