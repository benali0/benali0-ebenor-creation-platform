'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import type { GalleryImage } from '@/types';

interface Props {
  isOpen: boolean;
  image: GalleryImage | null | undefined;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export function DeleteConfirmModalItem({ isOpen, image, onConfirm, onCancel, isDeleting = false }: Props) {
  if (!image) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ backdropFilter: 'blur(0px)' }}
            animate={{ backdropFilter: 'blur(12px)' }}
            exit={{ backdropFilter: 'blur(0px)' }}
            className="absolute inset-0 bg-black/60"
          />

          <motion.div
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="relative bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Confirmer la suppression</h3>
                  <p className="text-sm text-red-100 mt-0.5">Cette action est irréversible</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200 mb-5">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0 ring-2 ring-neutral-200">
                  {image.thumbnailUrl || image.url ? (
                    // Use next/image if remote host allowed
                    <Image 
                      src={image.thumbnailUrl || image.url} 
                      alt={image.alt || image.title} 
                      fill 
                      sizes="80px"
                      className="object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-neutral-900 truncate">{image.title}</h4>
                  {image.category && <p className="text-sm text-neutral-600 truncate capitalize">{image.category}</p>}
                  {image.size && <p className="text-sm font-medium text-neutral-700 mt-1">{Math.round((image.size || 0) / 1024)} KB</p>}
                </div>
              </div>

              <div className="mb-6">
                <p className="text-neutral-700 leading-relaxed">Êtes-vous sûr de vouloir supprimer <span className="font-semibold text-neutral-900">"{image.title}"</span> ?</p>
                <p className="text-sm text-red-600 mt-2 font-medium">⚠️ Cette action ne peut pas être annulée.</p>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={onCancel} disabled={isDeleting} className="flex-1 px-4 py-3 bg-neutral-100 text-neutral-700 rounded-xl font-semibold hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Annuler</button>
                <button onClick={onConfirm} disabled={isDeleting} className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {isDeleting ? (
                    <>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                      <span>Suppression...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      <span>Supprimer définitivement</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
