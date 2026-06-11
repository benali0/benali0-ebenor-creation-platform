'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

interface BreadcrumbItem {
  label: string;
  href: string;
}

export function Breadcrumb() {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    // Map of paths to labels
    const pathMap: Record<string, string> = {
      '/admin': 'Administration',
      '/admin/dashboard': 'Tableau de bord',
      '/admin/products': 'Produits',
      '/admin/products/new': 'Nouveau produit',
      '/admin/products/edit': 'Modifier le produit',
      '/admin/messages': 'Messages',
      '/admin/content': 'Contenu',
      '/admin/homepage': 'Page d\'accueil',
      '/admin/homepage/hero': 'Section Hero',
      '/admin/homepage/about': 'Section À propos',
      '/admin/homepage/services': 'Section Services',
      '/admin/homepage/process': 'Section Processus',
      '/admin/homepage/testimonials': 'Section Témoignages',
      '/admin/homepage/contact': 'Section Contact',
      '/admin/media': 'Bibliothèque média',
      '/admin/categories': 'Catégories',
    };

    // Split pathname into segments
    const segments = pathname?.split('/').filter(Boolean) || [];
    
    // Build breadcrumb items
    const items: BreadcrumbItem[] = [];
    let currentPath = '';

    segments.forEach((segment) => {
      currentPath += `/${segment}`;
      
      // Get label from map or use segment as fallback
      let label = pathMap[currentPath] || segment;
      
      // Handle dynamic routes (e.g., /admin/products/[id]/edit)
      if (segment.match(/^[0-9a-f]{24}$/i)) {
        // MongoDB ObjectId pattern - skip it
        return;
      }
      
      // Capitalize first letter if not in map
      if (!pathMap[currentPath]) {
        label = segment.charAt(0).toUpperCase() + segment.slice(1);
      }

      items.push({
        label,
        href: currentPath,
      });
    });

    return items;
  }, [pathname]);

  // Don't show breadcrumb on login page or if only one item
  if (!pathname || pathname === '/admin/login' || breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-2 text-sm" aria-label="Breadcrumb">
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;
        
        return (
          <div key={item.href} className="flex items-center">
            {index > 0 && (
              <svg
                className="w-4 h-4 mx-2 text-neutral-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
            
            {isLast ? (
              <span className="text-neutral-900 font-medium" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
