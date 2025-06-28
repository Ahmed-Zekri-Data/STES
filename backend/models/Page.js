const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    enum: ['about', 'contact']
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  titleEn: {
    type: String,
    trim: true
  },
  titleAr: {
    type: String,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  contentEn: {
    type: String
  },
  contentAr: {
    type: String
  },
  metaDescription: {
    type: String,
    trim: true,
    maxlength: 160
  },
  metaDescriptionEn: {
    type: String,
    trim: true,
    maxlength: 160
  },
  metaDescriptionAr: {
    type: String,
    trim: true,
    maxlength: 160
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Index for better performance
pageSchema.index({ slug: 1 });
pageSchema.index({ isActive: 1 });

// Static method to get page by slug
pageSchema.statics.getBySlug = function(slug) {
  return this.findOne({ slug, isActive: true });
};

// Static method to initialize default pages
pageSchema.statics.initializeDefaultPages = async function() {
  const defaultPages = [
    {
      slug: 'about',
      title: 'À propos de STES.tn',
      titleEn: 'About STES.tn',
      titleAr: 'حول STES.tn',
      content: `
        <h2>Qui sommes-nous ?</h2>
        <p>STES.tn est votre partenaire de confiance pour tous vos besoins en équipements de piscines en Tunisie. Depuis notre création, nous nous engageons à fournir des produits de haute qualité et des services professionnels pour l'installation et la maintenance de piscines.</p>
        
        <h3>Notre Mission</h3>
        <p>Offrir des solutions complètes pour piscines, alliant qualité, innovation et service client exceptionnel.</p>
        
        <h3>Nos Services</h3>
        <ul>
          <li>Vente d'équipements de piscines</li>
          <li>Installation professionnelle</li>
          <li>Maintenance et réparation</li>
          <li>Conseil technique</li>
        </ul>
        
        <h3>Pourquoi nous choisir ?</h3>
        <ul>
          <li>Expertise technique reconnue</li>
          <li>Produits de marques réputées</li>
          <li>Service après-vente de qualité</li>
          <li>Livraison dans toute la Tunisie</li>
        </ul>
      `,
      contentEn: `
        <h2>Who are we?</h2>
        <p>STES.tn is your trusted partner for all your pool equipment needs in Tunisia. Since our establishment, we are committed to providing high-quality products and professional services for pool installation and maintenance.</p>
        
        <h3>Our Mission</h3>
        <p>To provide complete pool solutions, combining quality, innovation and exceptional customer service.</p>
        
        <h3>Our Services</h3>
        <ul>
          <li>Pool equipment sales</li>
          <li>Professional installation</li>
          <li>Maintenance and repair</li>
          <li>Technical consulting</li>
        </ul>
        
        <h3>Why choose us?</h3>
        <ul>
          <li>Recognized technical expertise</li>
          <li>Products from renowned brands</li>
          <li>Quality after-sales service</li>
          <li>Delivery throughout Tunisia</li>
        </ul>
      `,
      contentAr: `
        <h2>من نحن؟</h2>
        <p>STES.tn هو شريكك الموثوق لجميع احتياجاتك من معدات المسابح في تونس. منذ تأسيسنا، نحن ملتزمون بتوفير منتجات عالية الجودة وخدمات مهنية لتركيب وصيانة المسابح.</p>
        
        <h3>مهمتنا</h3>
        <p>تقديم حلول شاملة للمسابح، تجمع بين الجودة والابتكار وخدمة العملاء الاستثنائية.</p>
        
        <h3>خدماتنا</h3>
        <ul>
          <li>بيع معدات المسابح</li>
          <li>التركيب المهني</li>
          <li>الصيانة والإصلاح</li>
          <li>الاستشارة التقنية</li>
        </ul>
        
        <h3>لماذا تختارنا؟</h3>
        <ul>
          <li>خبرة تقنية معترف بها</li>
          <li>منتجات من علامات تجارية مشهورة</li>
          <li>خدمة ما بعد البيع عالية الجودة</li>
          <li>التوصيل في جميع أنحاء تونس</li>
        </ul>
      `,
      metaDescription: 'Découvrez STES.tn, votre spécialiste en équipements de piscines en Tunisie. Produits de qualité, installation professionnelle et service client exceptionnel.',
      metaDescriptionEn: 'Discover STES.tn, your pool equipment specialist in Tunisia. Quality products, professional installation and exceptional customer service.',
      metaDescriptionAr: 'اكتشف STES.tn، المتخصص في معدات المسابح في تونس. منتجات عالية الجودة، تركيب مهني وخدمة عملاء استثنائية.'
    },
    {
      slug: 'contact',
      title: 'Contactez-nous',
      titleEn: 'Contact Us',
      titleAr: 'اتصل بنا',
      content: `
        <h2>Contactez STES.tn</h2>
        <p>Nous sommes là pour répondre à toutes vos questions et vous accompagner dans vos projets de piscines.</p>
        
        <h3>Informations de Contact</h3>
        <div class="contact-info">
          <p><strong>Téléphone :</strong> +216 12 345 678</p>
          <p><strong>Email :</strong> info@stes.tn</p>
          <p><strong>Adresse :</strong> Tunis, Tunisie</p>
          <p><strong>WhatsApp :</strong> +216 12 345 678</p>
        </div>
        
        <h3>Horaires d'ouverture</h3>
        <ul>
          <li>Lundi - Vendredi : 8h00 - 18h00</li>
          <li>Samedi : 8h00 - 13h00</li>
          <li>Dimanche : Fermé</li>
        </ul>
        
        <h3>Nos Services</h3>
        <p>Contactez-nous pour :</p>
        <ul>
          <li>Devis gratuit pour vos projets</li>
          <li>Conseils techniques</li>
          <li>Support après-vente</li>
          <li>Commandes spéciales</li>
        </ul>
      `,
      contentEn: `
        <h2>Contact STES.tn</h2>
        <p>We are here to answer all your questions and support you in your pool projects.</p>
        
        <h3>Contact Information</h3>
        <div class="contact-info">
          <p><strong>Phone:</strong> +216 12 345 678</p>
          <p><strong>Email:</strong> info@stes.tn</p>
          <p><strong>Address:</strong> Tunis, Tunisia</p>
          <p><strong>WhatsApp:</strong> +216 12 345 678</p>
        </div>
        
        <h3>Opening Hours</h3>
        <ul>
          <li>Monday - Friday: 8:00 AM - 6:00 PM</li>
          <li>Saturday: 8:00 AM - 1:00 PM</li>
          <li>Sunday: Closed</li>
        </ul>
        
        <h3>Our Services</h3>
        <p>Contact us for:</p>
        <ul>
          <li>Free quotes for your projects</li>
          <li>Technical advice</li>
          <li>After-sales support</li>
          <li>Special orders</li>
        </ul>
      `,
      contentAr: `
        <h2>اتصل بـ STES.tn</h2>
        <p>نحن هنا للإجابة على جميع أسئلتكم ومساعدتكم في مشاريع المسابح الخاصة بكم.</p>
        
        <h3>معلومات الاتصال</h3>
        <div class="contact-info">
          <p><strong>الهاتف:</strong> +216 12 345 678</p>
          <p><strong>البريد الإلكتروني:</strong> info@stes.tn</p>
          <p><strong>العنوان:</strong> تونس، تونس</p>
          <p><strong>واتساب:</strong> +216 12 345 678</p>
        </div>
        
        <h3>ساعات العمل</h3>
        <ul>
          <li>الاثنين - الجمعة: 8:00 صباحاً - 6:00 مساءً</li>
          <li>السبت: 8:00 صباحاً - 1:00 ظهراً</li>
          <li>الأحد: مغلق</li>
        </ul>
        
        <h3>خدماتنا</h3>
        <p>اتصل بنا من أجل:</p>
        <ul>
          <li>عروض أسعار مجانية لمشاريعكم</li>
          <li>المشورة التقنية</li>
          <li>الدعم بعد البيع</li>
          <li>الطلبات الخاصة</li>
        </ul>
      `,
      metaDescription: 'Contactez STES.tn pour tous vos besoins en équipements de piscines. Devis gratuit, conseils techniques et support professionnel.',
      metaDescriptionEn: 'Contact STES.tn for all your pool equipment needs. Free quotes, technical advice and professional support.',
      metaDescriptionAr: 'اتصل بـ STES.tn لجميع احتياجاتكم من معدات المسابح. عروض أسعار مجانية، مشورة تقنية ودعم مهني.'
    }
  ];

  for (const pageData of defaultPages) {
    const existingPage = await this.findOne({ slug: pageData.slug });
    if (!existingPage) {
      await this.create(pageData);
    }
  }
};

module.exports = mongoose.model('Page', pageSchema);
