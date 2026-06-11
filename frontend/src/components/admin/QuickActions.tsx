'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  href: string;
}

// Externalize quick actions configuration for easy modification
const QUICK_ACTIONS: QuickAction[] = [
  {
    title: 'Ajouter un Produit',
    description: 'Créer un nouveau produit',
    color: 'from-amber-500 to-amber-600',
    href: '/admin/products/new',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    title: 'Bibliothèque Média',
    description: 'Gérer vos fichiers',
    color: 'from-blue-500 to-blue-600',
    href: '/admin/media',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    title: 'Messages',
    description: 'Voir les messages clients',
    color: 'from-green-500 to-green-600',
    href: '/admin/messages',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
  {
    title: 'Modifier le Contenu',
    description: 'Éditer la page d\'accueil',
    color: 'from-purple-500 to-purple-600',
    href: '/admin/content',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
];

export function QuickActions() {
  const router = useRouter();
  const actions = QUICK_ACTIONS;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
      <h2 className="text-lg font-semibold text-neutral-900 mb-6">Actions Rapides</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {actions.map((action, index) => (
          <motion.button
            key={action.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => router.push(action.href)}
            className="group relative overflow-hidden rounded-lg p-4 text-left transition-all hover:shadow-lg"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
            
            <div className="relative flex items-start space-x-4">
              <div className={`flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-lg`}>
                {action.icon}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-neutral-900 group-hover:text-amber-600 transition-colors">
                  {action.title}
                </h3>
                <p className="text-xs text-neutral-600 mt-1">
                  {action.description}
                </p>
              </div>
              
              <svg 
                className="w-5 h-5 text-neutral-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
