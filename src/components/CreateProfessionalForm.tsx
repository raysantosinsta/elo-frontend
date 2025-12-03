

// // versao shadcn
// 'use client';

// import { useForm } from 'react-hook-form';
// import { useState } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { Button } from "@/components/ui/button";
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from "@/components/ui/form";
// import { Input } from "@/components/ui/input";

// // Schema de validação com Zod
// const professionalFormSchema = z.object({
//   name: z.string()
//     .min(1, 'Nome é obrigatório')
//     .max(100, 'Nome deve ter no máximo 100 caracteres'),
//   role: z.string()
//     .min(1, 'Cargo é obrigatório')
//     .max(100, 'Cargo deve ter no máximo 100 caracteres'),
//   contact: z.string()
//     .max(20, 'Contato deve ter no máximo 20 caracteres')
//     .optional()
//     .or(z.literal('')),
// });

// type ProfessionalFormData = z.infer<typeof professionalFormSchema>;

// const CreateProfessionalForm: React.FC = () => {
//   const [successMessage, setSuccessMessage] = useState<string | null>(null);
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);

//   const form = useForm<ProfessionalFormData>({
//     resolver: zodResolver(professionalFormSchema),
//     defaultValues: {
//       name: "",
//       role: "",
//       contact: "",
//     },
//   });

//   const { isSubmitting } = form.formState;

//   const onSubmit = async (data: ProfessionalFormData) => {
//     try {
//       setErrorMessage(null);
//       const response = await fetch('http://localhost:3002/professionals', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(data),
//       });

//       if (!response.ok) {
//         throw new Error('Falha ao criar profissional');
//       }

//       const result = await response.json();
//       console.log('Profissional criado:', result);
//       setSuccessMessage('Profissional criado com sucesso!');
//       form.reset();
      
//       setTimeout(() => setSuccessMessage(null), 5000);
//     } catch (error) {
//       if (error instanceof Error) {
//         setErrorMessage('Erro ao criar profissional: ' + error.message);
//       }
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
//       <div className="w-full max-w-lg">
//         {/* Card Container */}
//         <motion.div
//           initial={{ opacity: 0, scale: 0.95 }}
//           animate={{ opacity: 1, scale: 1 }}
//           transition={{ duration: 0.4 }}
//           className="bg-white rounded-2xl shadow-xl border border-slate-200"
//         >
//           {/* Header */}
//           <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6">
//             <div className="flex items-center space-x-4">
//               <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
//                 <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
//                 </svg>
//               </div>
//               <div className="text-left">
//                 <h2 className="text-xl font-bold text-white">Cadastrar Profissional</h2>
//                 <p className="text-blue-100 text-sm">Adicione um novo membro à equipe</p>
//               </div>
//             </div>
//           </div>

//           {/* Form */}
//           <div className="px-8 py-6">
//             <Form {...form}>
//               <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
//                 {/* Name Field */}
//                 <FormField
//                   control={form.control}
//                   name="name"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel className="text-sm font-semibold text-gray-800">
//                         Nome Completo *
//                       </FormLabel>
//                       <FormControl>
//                         <div className="relative">
//                           <Input
//                             placeholder="João Silva"
//                             className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-500 text-gray-900 bg-white text-sm pr-10"
//                             {...field}
//                           />
//                           <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
//                             <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
//                             </svg>
//                           </div>
//                         </div>
//                       </FormControl>
//                       <FormMessage />
//                     </FormItem>
//                   )}
//                 />

//                 {/* Role Field */}
//                 <FormField
//                   control={form.control}
//                   name="role"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel className="text-sm font-semibold text-gray-800">
//                         Cargo *
//                       </FormLabel>
//                       <FormControl>
//                         <div className="relative">
//                           <Input
//                             placeholder="Desenvolvedor Frontend"
//                             className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-500 text-gray-900 bg-white text-sm pr-10"
//                             {...field}
//                           />
//                           <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
//                             <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
//                             </svg>
//                           </div>
//                         </div>
//                       </FormControl>
//                       <FormMessage />
//                     </FormItem>
//                   )}
//                 />

//                 {/* Contact Field */}
//                 <FormField
//                   control={form.control}
//                   name="contact"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel className="text-sm font-semibold text-gray-800">
//                         Contato
//                         <span className="text-gray-600 font-normal ml-1">(opcional)</span>
//                       </FormLabel>
//                       <FormControl>
//                         <div className="relative">
//                           <Input
//                             placeholder="+55 (11) 99999-9999"
//                             className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-500 text-gray-900 bg-white text-sm pr-10"
//                             {...field}
//                           />
//                           <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
//                             <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
//                             </svg>
//                           </div>
//                         </div>
//                       </FormControl>
//                       <FormMessage />
//                     </FormItem>
//                   )}
//                 />

//                 {/* Submit Button */}
//                 <div className="pt-2">
//                   <motion.div
//                     whileHover={{ scale: 1.02 }}
//                     whileTap={{ scale: 0.98 }}
//                   >
//                     <Button
//                       type="submit"
//                       disabled={isSubmitting}
//                       className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3 px-6 rounded-lg font-semibold text-sm tracking-wide shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center h-12"
//                     >
//                       {isSubmitting ? (
//                         <>
//                           <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                           </svg>
//                           Cadastrando...
//                         </>
//                       ) : (
//                         <>
//                           <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
//                           </svg>
//                           Cadastrar Profissional
//                         </>
//                       )}
//                     </Button>
//                   </motion.div>
//                 </div>
//               </form>
//             </Form>
//           </div>
//         </motion.div>

//         {/* Messages */}
//         <AnimatePresence>
//           {successMessage && (
//             <motion.div
//               initial={{ opacity: 0, y: 10 }}
//               animate={{ opacity: 1, y: 0 }}
//               exit={{ opacity: 0, y: 10 }}
//               className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center"
//             >
//               <svg className="w-4 h-4 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
//                 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
//               </svg>
//               <span className="text-green-800 text-sm font-medium">{successMessage}</span>
//             </motion.div>
//           )}

//           {errorMessage && (
//             <motion.div
//               initial={{ opacity: 0, y: 10 }}
//               animate={{ opacity: 1, y: 0 }}
//               exit={{ opacity: 0, y: 10 }}
//               className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center"
//             >
//               <svg className="w-4 h-4 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
//                 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
//               </svg>
//               <span className="text-red-800 text-sm font-medium">{errorMessage}</span>
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </div>
//     </div>
//   );
// };

// export default CreateProfessionalForm;