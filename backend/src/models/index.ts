// Export de tous les modèles Mongoose
export { HomeContent, HomeContentDocument } from './HomeContent';
export { Product, ProductDocument } from './Product';
export { GalleryImage, GalleryImageDocument } from './GalleryImage';
export { Message, MessageDocument } from './Message';
export { AdminUser, AdminUserDocument } from './AdminUser';
export { AuditLog, AuditLogDocument } from './AuditLog';
export { Category, ICategory } from './Category';

// Types pour les requêtes de base de données
export interface DatabaseModels {
  HomeContent: typeof HomeContent;
  Product: typeof Product;
  GalleryImage: typeof GalleryImage;
  Message: typeof Message;
  AdminUser: typeof AdminUser;
  AuditLog: typeof AuditLog;
  Category: typeof Category;
}

// Fonction utilitaire pour initialiser les modèles
export async function initializeModels(): Promise<void> {
  try {
    // Créer l'utilisateur admin par défaut s'il n'existe pas
    const { AdminUser } = await import('./AdminUser');
    await AdminUser.createDefaultAdmin();
    
    // Créer les catégories par défaut si elles n'existent pas
    const { Category } = await import('./Category');
    const defaultCategories = [
      {
        name: 'Cuisine',
        slug: 'cuisine',
        description: 'Meubles de cuisine sur mesure',
        icon: '🍳',
        color: '#ef4444',
        displayOrder: 1,
      },
      {
        name: 'Dressing',
        slug: 'dressing',
        description: 'Dressings et rangements personnalisés',
        icon: '👔',
        color: '#3b82f6',
        displayOrder: 2,
      },
      {
        name: 'Mobilier',
        slug: 'mobilier',
        description: 'Mobilier sur mesure pour tous espaces',
        icon: '🪑',
        color: '#10b981',
        displayOrder: 3,
      },
      {
        name: 'Aménagement',
        slug: 'amenagement',
        description: 'Aménagement intérieur complet',
        icon: '🏠',
        color: '#f59e0b',
        displayOrder: 4,
      },
      {
        name: 'Salon',
        slug: 'salon',
        description: 'Meubles et aménagements pour le salon',
        icon: '🛋️',
        color: '#8b5cf6',
        displayOrder: 5,
      },
      {
        name: 'Chambre à coucher',
        slug: 'chambre-a-coucher',
        description: 'Lits, tables de chevet et rangements de chambre',
        icon: '🛏️',
        color: '#ec4899',
        displayOrder: 6,
      },
      {
        name: 'Autre',
        slug: 'autre',
        description: 'Autres créations sur mesure',
        icon: '📦',
        color: '#6b7280',
        displayOrder: 7,
      },
    ];

    for (const cat of defaultCategories) {
      const exists = await Category.findOne({ slug: cat.slug });
      if (!exists) {
        await Category.create(cat);
        console.log(`✅ Catégorie par défaut créée: ${cat.name}`);
      }
    }

    console.log('✅ Modèles de base de données initialisés avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation des modèles:', error);
    throw error;
  }
}

// Fonction pour créer les index de base de données
export async function createIndexes(): Promise<void> {
  try {
    const models = [
      (await import('./HomeContent')).HomeContent,
      (await import('./Product')).Product,
      (await import('./GalleryImage')).GalleryImage,
      (await import('./Message')).Message,
      (await import('./AdminUser')).AdminUser,
      (await import('./AuditLog')).AuditLog,
      (await import('./Category')).Category
    ];

    for (const model of models) {
      await model.createIndexes();
      console.log(`✅ Index créés pour ${model.modelName}`);
    }
    
    console.log('✅ Tous les index de base de données ont été créés');
  } catch (error) {
    console.error('❌ Erreur lors de la création des index:', error);
    throw error;
  }
}