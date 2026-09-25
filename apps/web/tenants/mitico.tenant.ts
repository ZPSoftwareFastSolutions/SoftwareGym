/**
 * CONFIGURACIÓN DE TENANT — MÍTICO FITNESS
 *
 * Este archivo es el único artefacto que define cómo se ve y qué dice el sitio
 * de Mítico Fitness. No existe ningún componente, ruta ni hoja de estilo
 * específica de este cliente, y en esta versión tampoco existe ninguna base de
 * datos: la landing entera se prerenderiza a partir de lo que hay aquí.
 *
 * Paleta, derivada del LOGOTIPO OFICIAL que entregó el CEO (brand/mitico/):
 *   Verde Mítico      #00FA2D  — el verde exacto del logo (90 % de sus píxeles
 *                                verdes). Acción, foco, énfasis.
 *   Verde Profundo    #00D126  — hover del botón principal
 *   Verde Estructural #137224  — bloques y tarjetas (mismo matiz, 131°)
 *   Verde de Barra    #0F3E17  — barras y controles superiores
 *   Negro Carbón      #1A1C1E  — superficie de tarjeta
 *   Blanco / Gris     #FFFFFF / #D1D1D1 — el contorno y el gris del logo
 *
 * Hasta la V3 el sitio usaba #39FF14, un neón más amarillento que el del logo.
 * Con el logo en la cabecera la diferencia se veía lado a lado; todos los
 * verdes se movieron al matiz del logo y conservan contraste AA o mejor
 * (13,5:1 el texto del botón; 6:1 el blanco sobre el verde estructural).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ORIGEN DE LOS DATOS
 *
 * OFICIAL, de los documentos entregados por el cliente:
 *   · `tarifario_gym_mitico.md` → planGroups, trainingPlans, plansNote
 *   · `horarios_m_tico_fitness.md` → branches.sedes (direcciones no: ver abajo),
 *     los horarios de atención de cada sede, los teléfonos y content.classes
 *   · Slogan, redes sociales y llamada a la acción, del material comercial.
 *
 * REAL, heredado del material comercial anterior: content.products.
 *
 * PENDIENTE DE CONFIRMAR POR ESCRITO CON EL CLIENTE — redacción propia sobre
 * hechos que sí constan, o huecos que el gimnasio debe rellenar:
 *   · contact.email (hoy vacío a propósito: sin correo confirmado no se publica
 *     uno inventado, y la vitrina omite la fila)
 *   · La DIRECCIÓN EXACTA de cada sede. Los documentos solo dan el nombre de la
 *     zona («Centro / El Prado», «Miraflores»); lo que hay en `address` es eso,
 *     no una dirección postal.
 *   · content.about (relato y valores), content.facilities (qué hay en cada
 *     sede), content.gallery (fotografías reales) y content.hero.stats.
 *
 * NO SE PUBLICA LO QUE NO SE PUEDE SOSTENER: equipo (`showTeam`) y testimonios
 * (`showTestimonials`) quedan apagados y sin contenido. Poner nombres de
 * entrenadores o reseñas de socios inventados en el sitio real de un gimnasio
 * no es contenido de relleno, es información falsa sobre personas.
 */

import type { TenantConfig } from '@core/domain/tenant/tenant-config';
import { DEFAULT_FEATURE_FLAGS } from '@core/domain/tenant/feature-flags';

/** Horario de atención de la sede del Centro (El Prado). */
const SEMANA_CENTRO = [
  { day: 'Lunes', open: '07:00', close: '23:00', closed: false },
  { day: 'Martes', open: '07:00', close: '23:00', closed: false },
  { day: 'Miércoles', open: '07:00', close: '23:00', closed: false },
  { day: 'Jueves', open: '07:00', close: '23:00', closed: false },
  { day: 'Viernes', open: '07:00', close: '23:00', closed: false },
  { day: 'Sábado', open: '09:00', close: '22:00', closed: false },
  { day: 'Domingo', open: '', close: '', closed: true },
] as const;

/** Horario de atención de Mítico Fitness Life (Miraflores). Abre domingos. */
const SEMANA_MIRAFLORES = [
  { day: 'Lunes', open: '07:00', close: '23:00', closed: false },
  { day: 'Martes', open: '07:00', close: '23:00', closed: false },
  { day: 'Miércoles', open: '07:00', close: '23:00', closed: false },
  { day: 'Jueves', open: '07:00', close: '23:00', closed: false },
  { day: 'Viernes', open: '07:00', close: '23:00', closed: false },
  { day: 'Sábado', open: '08:00', close: '22:00', closed: false },
  { day: 'Domingo', open: '08:00', close: '14:00', closed: false },
] as const;

export const miticoTenant: TenantConfig = {
  slug: 'mitico',
  name: 'Mítico Fitness',
  // PENDIENTE: razón social y NIT sin confirmar por el cliente. Hasta tenerlos
  // se publica el nombre comercial: una razón social supuesta en un aviso legal
  // identificaría a una empresa que puede no existir con ese nombre.
  legalName: 'Mítico Fitness',
  tagline: 'El dolor que sientes hoy es la fuerza que tendrás mañana. Si crees que puedes, puedes.',

  domains: ['miticofitness.com', 'www.miticofitness.com'],

  branding: {
    mode: 'dark',
    logo: {
      wordmark: 'Mítico',
      subMark: 'Fitness',
      monogram: 'M',
      // Logotipo oficial (versión plana). Los archivos salen de
      // `node scripts/generar-marca.mjs mitico` a partir de
      // `brand/mitico/logo-plano.png`: no se editan a mano.
      mark: { src: '/tenants/mitico/isotipo.png', width: 252, height: 192 },
      full: { src: '/tenants/mitico/logo.png', width: 640, height: 637 },
      icons: {
        favicon: '/tenants/mitico/favicon.ico',
        icon: '/tenants/mitico/icon-192.png',
        apple: '/tenants/mitico/apple-icon.png',
      },
    },
    palette: {
      primary: '#00FA2D',
      primaryStrong: '#00D126',
      structural: '#137224',
      structuralDeep: '#0F3E17',
      surface: '#0C0E0F',
      surfaceRaised: '#131617',
      surfaceCard: '#1A1C1E',
      text: '#FFFFFF',
      textMuted: '#98A49A',
      border: '#252C26',
      accent: '#D1D1D1',
    },
    typography: {
      display: 'var(--font-display-condensed), "Arial Narrow", sans-serif',
      body: 'var(--font-body-sans), system-ui, sans-serif',
      scale: 'editorial',
      uppercaseHeadings: true,
      headingTracking: '0.02em',
    },
    shape: {
      corners: 'soft',
      surfaceStyle: 'glass',
      glowIntensity: 2,
      showGrid: true,
    },
  },

  contact: {
    phone: '77700867',
    whatsapp: '59177700867',
    whatsappMessage:
      'Hola Mítico Fitness 👋 Quiero información sobre los paquetes y precios.',
    // Vacío a propósito: no hay correo confirmado por el cliente. La sección de
    // contacto omite la fila en vez de publicar una dirección inventada.
    email: '',
    addressLine: 'Sedes en el Centro (El Prado) y en Miraflores',
    city: 'La Paz',
    country: 'Bolivia',
    mapEmbedUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d927.4326416674123!2d-68.13122116825956!3d-16.503825761222917!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x915f210016025b69%3A0x484d1d8a96c0313f!2sM%C3%ADtico%20Fitness!5e1!3m2!1ses-419!2sbo!4v1788959383433!5m2!1ses-419!2sbo',
    mapLinkUrl: 'https://maps.app.goo.gl/?q=M%C3%ADtico+Fitness+La+Paz',
  },

  social: {
    facebook: 'https://www.facebook.com/profile.php?id=100067354614799',
    instagram: 'https://www.instagram.com/mitico_fit/',
    tiktok: 'https://www.tiktok.com/@mitico_fitness',
    youtube: 'https://www.youtube.com/@miticofitness',
  },

  /**
   * Horario general del gimnasio: el de la sede principal. El de cada sucursal
   * vive en su propia entrada de `branches.sedes` y es el que manda en la
   * página de horarios, porque las dos sedes no cierran igual.
   */
  hours: {
    timezone: 'America/La_Paz',
    week: [...SEMANA_CENTRO],
    holidayNote:
      'Mítico Fitness Life (Miraflores) abre también los domingos, de 08:00 a 14:00.',
  },

  /**
   * Las etiquetas son dato del tenant; los segmentos son las rutas del
   * producto. Otro gimnasio nombra las mismas rutas de otra forma sin que se
   * toque un archivo de la aplicación.
   */
  navigation: [
    { label: 'Inicio', segment: '' },
    { label: 'Nosotros', segment: 'nosotros' },
    { label: 'Servicios', segment: 'servicios' },
    { label: 'Planes', segment: 'planes', requiresFeature: 'showPlans' },
    { label: 'Sucursales', segment: 'sucursales', requiresFeature: 'showBranches' },
    { label: 'Clases', segment: 'clases', requiresFeature: 'showClasses' },
    { label: 'Instalaciones', segment: 'instalaciones', requiresFeature: 'showFacilities' },
    { label: 'Galería', segment: 'galeria', requiresFeature: 'showGallery' },
    { label: 'Horarios', segment: 'horarios', requiresFeature: 'showSchedule' },
    { label: 'Contacto', segment: 'contacto' },
  ],

  features: {
    ...DEFAULT_FEATURE_FLAGS,
    showPlans: true,
    showTrainingPlans: true,
    showProducts: true,
    showFacilities: true,
    showGallery: true,
    showSchedule: true,
    showClasses: true,
    showBranches: true,
    showLocationMap: true,
    whatsappFloatingButton: true,
    contactForm: true,

    // Sin datos confirmados no hay sección: ver la nota de cabecera.
    showTeam: false,
    showTestimonials: false,
  },

  seo: {
    title: 'Mítico Fitness — El dolor que sientes hoy es la fuerza que tendrás mañana. Si crees que puedes, puedes.',
    titleTemplate: '%s | Mítico Fitness',
    description:
      'Gimnasio en La Paz con dos sedes, Centro (El Prado) y Miraflores. Paquetes mensuales desde 180 Bs, rutinas de entrenamiento personalizado, baile urbano, Fight DO, heels, danza árabe y nutricionista profesional.',
    keywords: [
      'gimnasio la paz',
      'gimnasio el prado la paz',
      'gimnasio miraflores la paz',
      'mítico fitness',
      'mítico fitness life',
      'entrenamiento personalizado',
      'baile urbano la paz',
      'fight do',
      'danza árabe',
      'paquetes de gimnasio',
    ],
    locale: 'es_BO',
  },

  // Avisos legales (/mitico/legal/*). Sin NIT hasta que el cliente lo entregue.
  legal: {
    updatedAt: '2026-09-25',
  },

  provisioning: {
    plan: 'professional',
    activeSince: '2026-01-15',
    status: 'active',
  },

  content: {
    hero: {
      eyebrow: 'La Paz · Centro y Miraflores',
      title: 'Vamos con',
      titleAccent: 'todo',
      subtitle:
        'El dolor que sientes hoy es la fuerza que tendrás mañana. Entrenamiento personalizado, clases dirigidas y nutrición profesional, en dos sedes y con paquetes para entrenar en una o en las dos.',
      primaryCta: { label: 'Ver paquetes', segment: 'planes' },
      secondaryCta: { label: 'Hablar por WhatsApp', segment: 'contacto' },
      // PENDIENTE: cifras a confirmar con el cliente. Las dos primeras salen de
      // los documentos oficiales; las otras dos son las que el gimnasio tiene
      // que dar antes de publicar.
      stats: [
        { value: '2', label: 'sedes en La Paz' },
        { value: '5', label: 'disciplinas dirigidas' },
        { value: '6', label: 'rutinas personalizadas' },
        { value: '07–23 h', label: 'de lunes a viernes' },
      ],
    },

    about: {
      eyebrow: 'Mítico',
      title: 'Descubre el héroe que vive en ti',
      lead:
        'Mítico Fitness es un gimnasio de La Paz donde el entrenamiento se arma alrededor de la persona, no al revés.',
      paragraphs: [
        'Nuestra misión es transmitir lo importante que es la lucha constante contra uno mismo para la superación plena del alma y así alcanzar metas. Todo a través de sentirse mejor con uno mismo ("fitness", el bienestar y el hábito saludable) y "life", que abarca todo lo que te lleva a tener una vida mejor.',
        'Nuestra visión es brindar un servicio de calidad ofreciendo entrenamientos en los que la gente pueda superarse. Queremos ofrecer opciones que ayuden a crear un mundo diferente; un mundo en el que todos podamos cuidar lo más importante que tenemos: la vida.',
        'Buscamos llegar a todos los rincones de Bolivia y a otros países del mundo.',
      ],
      values: [
        {
          title: 'Entrenamiento personalizado',
          description:
            'Seguimiento individual y rutina asignada según tu nivel, incluido en todos los paquetes.',
          icon: 'trainer',
        },
        {
          title: 'Nutrición profesional',
          description:
            'Nutricionista disponible en los paquetes Básico Fit, Mítico y Mítico Dance, y en la rutina Hulk / Mujer Maravilla.',
          icon: 'nutrition',
        },
        {
          title: 'Clases dirigidas',
          description:
            'Baile urbano, Fight DO, heels y danza árabe como parte del entrenamiento en los paquetes Dance.',
          icon: 'group',
        },
        {
          title: 'Suplementación',
          description:
            'Proteína, creatina, pre-entrenos y aminoácidos disponibles en el mostrador del gimnasio.',
          icon: 'sparkle',
        },
        {
          title: 'Respeto y Familia',
          description:
            'En Mítico nos sentimos como una familia. Fomentamos el respeto hacia las demás personas y hacia las instalaciones.',
          icon: 'heart',
        },
        {
          title: 'Confianza y Comunidad',
          description:
            'Te damos la confianza de poner la música que quieres, compartir con los demás y disfrutar de eventos únicos.',
          icon: 'sparkle',
        },
        {
          title: 'Segunda Casa',
          description:
            'Queremos que todos se sientan siempre como si estuvieran en su segunda casa, entrenando en un ambiente seguro.',
          icon: 'home',
        },
      ],
      milestones: [
        {
          year: '2021',
          text: 'Mítico nació el 27 de abril inspirado en la mitología, los superhéroes y el vínculo padre e hijo. Empezó el 2 de mayo como un cuarto pequeño con pesas de colores. Poco a poco, fuimos absorbiendo los locales contiguos para construir nuestra primera sala de baile.',
        },
        {
          year: '2022',
          text: 'Consolidación de la planta baja. De 6 clientes iniciales pasamos a ser una comunidad de casi 100 personas entrenando con nosotros.',
        },
        {
          year: '2023',
          text: 'La gran expansión. Tomamos la planta superior (ex Karaoke Mix), incorporamos temática visual de superhéroes, dividimos zonas por grupos musculares y llegamos a los 400 alumnos al mes.',
        },
        {
          year: '2025',
          text: 'Un año de resistencia y aprendizaje. Superamos obstáculos y reorganizamos el equipo con la mirada puesta en un objetivo mayor: abrir nuestra segunda sucursal.',
        },
        {
          year: '2026',
          text: 'Nace Mítico Fitness Life. Tras meses de búsqueda, abrimos en Miraflores una sucursal con un concepto enfocado no solo en entrenar, sino en nutrición y estilo de vida.',
        },
      ],
    },

    services: [
      {
        id: 'entrenamiento-personalizado',
        name: 'Entrenamiento personalizado',
        summary: 'Descubre el héroe que vive en ti.',
        description:
          'Seis rutinas con entrenador y seguimiento individual, de 240 a 550 Bs al mes. Incluyen pre-entreno y batido semanal, y la rutina Hulk / Mujer Maravilla suma nutricionista profesional.',
        icon: 'trainer',
        highlights: ['Desde 240 Bs al mes', 'Rutinas con nombre propio', 'Seguimiento personal'],
      },
      {
        id: 'acceso-gimnasio',
        name: 'Acceso al gimnasio',
        summary: 'Acceso completo a todas las máquinas, con horario flexible.',
        description:
          'Todos los paquetes mensuales incluyen acceso completo al gimnasio y entrenamiento personalizado. Los paquetes Life valen en las dos sucursales.',
        icon: 'dumbbell',
        highlights: ['Desde 180 Bs al mes', 'Abierto de 07:00 a 23:00', 'Opción para dos sedes'],
      },
      {
        id: 'clases-dirigidas',
        name: 'Clases dirigidas',
        summary: 'Baile urbano, Fight DO, heels y danza árabe.',
        description:
          'Disponibles en los paquetes Básico Dance, Fit Dance, Mítico Fitness y Mítico Dance. Entrenas y bailas dentro de la misma membresía, sin pagar aparte.',
        icon: 'group',
        highlights: ['Cuatro disciplinas', 'Incluidas en los paquetes Dance', 'Horario propio por sede'],
      },
      {
        id: 'nutricion',
        name: 'Asesoría nutricional',
        summary: 'Nutricionista profesional dentro del gimnasio.',
        description:
          'Incluida en los paquetes Básico Fit, Mítico y Mítico Dance, y en la rutina personalizada Hulk / Mujer Maravilla. El plan alimentario acompaña al entrenamiento, no lo contradice.',
        icon: 'nutrition',
        highlights: ['Nutricionista profesional', 'Incluida en varios paquetes', 'Seguimiento continuo'],
      },
      {
        id: 'suplementacion',
        name: 'Suplementación y productos',
        summary: 'Proteínas, pre-entrenos, aminoácidos y accesorios.',
        description:
          'Venta en el mostrador del gimnasio: proteína, creatina, pre-entrenos, hidratación y accesorios como shakers y tomatodos, además de la ropa deportiva de la casa.',
        icon: 'sparkle',
        highlights: ['Proteína y creatina', 'Pre-entrenos', 'Shakers y ropa deportiva'],
      },
    ],

    // Tarifario oficial. Los paquetes que el documento vende con dos precios
    // —una sucursal o las dos— se declaran como UN paquete con `altPrice`, que
    // es como están escritos: no son dos productos distintos.
    planGroups: [
      {
        id: 'mensual-basico',
        name: 'Paquete Mensual Básico',
        description:
          'Para comenzar. Acceso completo al gimnasio con entrenamiento personalizado, y la opción de entrar a las dos sucursales o de sumar una disciplina de baile.',
        plans: [
          {
            id: 'basico',
            name: 'Básico',
            tagline: 'El punto de partida',
            price: 180,
            currency: 'Bs',
            period: 'mensual',
            featured: true,
            features: [
              { label: 'Entrenamiento personalizado', included: true },
              { label: 'Entrada a dos sucursales', included: false },
              { label: 'Disciplina de baile', included: false },
            ],
            ctaLabel: 'Consultar',
          },
          {
            id: 'basico-life',
            name: 'Básico Life',
            tagline: 'El mismo paquete, en las dos sedes',
            price: 200,
            currency: 'Bs',
            period: 'mensual',
            featured: false,
            features: [
              { label: 'Entrenamiento personalizado', included: true },
              { label: 'Entrada a dos sucursales', included: true },
              { label: 'Disciplina de baile', included: false },
            ],
            ctaLabel: 'Consultar',
          },
          {
            id: 'basico-dance',
            name: 'Básico Dance',
            tagline: 'Suma una disciplina',
            price: 300,
            currency: 'Bs',
            period: 'mensual',
            featured: false,
            features: [
              { label: 'Una disciplina de baile', included: true },
              { label: 'Entrada a dos sucursales', included: false },
            ],
            ctaLabel: 'Consultar',
          },
          {
            id: 'basico-dance-life',
            name: 'Básico Dance Life',
            tagline: 'Una disciplina, en las dos sedes',
            price: 400,
            currency: 'Bs',
            period: 'mensual',
            featured: false,
            features: [
              { label: 'Una disciplina de baile Life', included: true },
              { label: 'Entrada a dos sucursales', included: true },
            ],
            ctaLabel: 'Consultar',
          },
        ],
      },
      {
        id: 'mensual-fit',
        name: 'Paquete Mensual Fit',
        description:
          'Potencia tus resultados con batido semanal y asesoría nutricional profesional. Cada paquete tiene su precio para una sucursal y para las dos.',
        plans: [
          {
            id: 'fit',
            name: 'Fit',
            tagline: 'Entrenamiento con batido semanal',
            price: 220,
            currency: 'Bs',
            period: 'mensual',
            altPrice: { label: 'con las dos sucursales', price: 240 },
            featured: true,
            features: [
              { label: 'Entrenamiento personalizado', included: true },
              { label: 'Batido semanal', included: true },
              { label: 'Nutricionista profesional', included: false },
              { label: 'Disciplina de baile', included: false },
            ],
            ctaLabel: 'Consultar',
          },
          {
            id: 'basico-fit',
            name: 'Básico Fit',
            tagline: 'Con nutricionista profesional',
            price: 280,
            currency: 'Bs',
            period: 'mensual',
            altPrice: { label: 'con las dos sucursales', price: 300 },
            featured: false,
            features: [
              { label: 'Entrenamiento personalizado', included: true },
              { label: 'Nutricionista profesional', included: true },
              { label: 'Batido semanal', included: false },
              { label: 'Disciplina de baile', included: false },
            ],
            ctaLabel: 'Consultar',
          },
          {
            id: 'fit-dance',
            name: 'Fit Dance',
            tagline: 'Batido semanal y baile fitness',
            price: 300,
            currency: 'Bs',
            period: 'mensual',
            altPrice: { label: 'con las dos sucursales', price: 420 },
            featured: false,
            features: [
              { label: 'Entrenamiento personalizado', included: true },
              { label: 'Batido semanal', included: true },
              { label: 'Baile fitness', included: true },
              { label: 'Nutricionista profesional', included: false },
            ],
            ctaLabel: 'Consultar',
          },
        ],
      },

      {
        id: 'mensual-mitico',
        name: 'Paquete Mensual Mítico',
        description:
          'La experiencia completa: entrenamiento, baile y nutrición profesional. Cada paquete tiene su precio para una sucursal y para las dos.',
        plans: [
          {
            id: 'mitico',
            name: 'Mítico',
            tagline: 'Nutrición y batido semanal',
            price: 300,
            currency: 'Bs',
            period: 'mensual',
            altPrice: { label: 'con las dos sucursales', price: 320 },
            featured: true,
            features: [
              { label: 'Entrenamiento personalizado', included: true },
              { label: 'Batido semanal', included: true },
              { label: 'Nutricionista profesional', included: true },
              { label: 'Disciplina de baile', included: false },
            ],
            ctaLabel: 'Consultar',
          },
          {
            id: 'mitico-dance',
            name: 'Mítico Dance',
            tagline: 'Todo lo anterior, más baile fitness',
            price: 400,
            currency: 'Bs',
            period: 'mensual',
            altPrice: { label: 'con las dos sucursales', price: 450 },
            featured: false,
            features: [
              { label: 'Entrenamiento personalizado', included: true },
              { label: 'Batido semanal', included: true },
              { label: 'Nutricionista profesional', included: true },
              { label: 'Baile fitness', included: true },
            ],
            ctaLabel: 'Consultar',
          },
          {
            id: 'mitico-fitness',
            name: 'Mítico Fitness',
            tagline: 'Dos disciplinas de baile',
            price: 430,
            currency: 'Bs',
            period: 'mensual',
            altPrice: { label: 'con las dos sucursales', price: 530 },
            featured: false,
            features: [
              { label: 'Entrenamiento personalizado', included: true },
              { label: 'Dos disciplinas de baile', included: true },
              { label: 'Batido semanal', included: false },
              { label: 'Nutricionista profesional', included: false },
            ],
            ctaLabel: 'Consultar',
          },
        ],
      },
      {
        id: 'otros-planes',
        name: 'Otros planes',
        description:
          'La sesión suelta para probar sin comprometerte, y los planes largos para quien ya sabe que se queda.',
        plans: [
          {
            id: 'sesion',
            name: 'Sesión',
            tagline: 'Un día, para probar',
            price: 30,
            currency: 'Bs',
            period: 'diario',
            featured: false,
            features: [{ label: 'Acceso completo al gimnasio por un día', included: true }],
            ctaLabel: 'Consultar',
          },
          {
            id: 'trimestral',
            name: 'Trimestral',
            tagline: 'Tres meses por adelantado',
            price: 420,
            currency: 'Bs',
            period: 'trimestral',
            featured: false,
            features: [{ label: 'Acceso completo al gimnasio por tres meses', included: true }],
            ctaLabel: 'Consultar',
          },
          {
            id: 'semestral',
            name: 'Semestral',
            tagline: 'Seis meses por adelantado',
            price: 820,
            currency: 'Bs',
            period: 'semestral',
            featured: false,
            features: [{ label: 'Acceso completo al gimnasio por seis meses', included: true }],
            ctaLabel: 'Consultar',
          },
          {
            id: 'anual',
            name: 'Anual',
            tagline: 'El año entero',
            price: 1500,
            currency: 'Bs',
            period: 'anual',
            featured: true,
            badge: 'Mejor precio por mes',
            features: [{ label: 'Acceso completo al gimnasio por un año', included: true }],
            ctaLabel: 'Consultar',
          },
        ],
      },
    ],

    plansNote:
      'Precios en bolivianos, vigentes según el tarifario oficial del gimnasio. Consúltanos por WhatsApp qué paquete te conviene antes de pagar: te lo explicamos sin compromiso y el pago se hace en recepción.',

    // Planes Superhéroes del tarifario oficial. Categoría distinta de los
    // paquetes: se venden por la rutina que te asignan, no por el acceso.
    trainingPlans: [
      {
        id: 'rutina-spiderman',
        name: 'Rutina Spiderman / Viuda Negra',
        tagline: 'Entrenamiento y seguimiento, con dos batidos por semana',
        price: 240,
        currency: 'Bs',
        period: 'mensual',
        featured: false,
        features: [
          { label: 'Entrenamiento personalizado', included: true },
          { label: 'Seguimiento personal', included: true },
          { label: '2 batidos semanales', included: true },
          { label: 'Pre-entreno', included: false },
          { label: 'Nutricionista profesional', included: false },
        ],
        routines: ['Spiderman (hombres)', 'Viuda Negra (mujeres)'],
        ctaLabel: 'Consultar',
        seed: 17,
      },
      {
        id: 'rutina-batman',
        name: 'Rutina Batman / Gamora',
        tagline: 'Suma el pre-entreno al seguimiento personal',
        price: 240,
        currency: 'Bs',
        period: 'mensual',
        featured: false,
        features: [
          { label: 'Entrenamiento personalizado', included: true },
          { label: 'Seguimiento personal', included: true },
          { label: '1 pre-entreno', included: true },
          { label: '1 batido semanal', included: true },
          { label: 'Nutricionista profesional', included: false },
        ],
        routines: ['Batman (hombres)', 'Gamora (mujeres)'],
        ctaLabel: 'Consultar',
        seed: 31,
      },
      {
        id: 'rutina-capitan-america',
        name: 'Rutina Capitán América / Capitana Marvel',
        tagline: 'Dos pre-entrenos personales cada semana',
        price: 370,
        currency: 'Bs',
        period: 'mensual',
        featured: false,
        features: [
          { label: 'Entrenamiento personalizado', included: true },
          { label: '2 pre-entrenos personales', included: true },
          { label: '1 batido semanal', included: true },
          { label: 'Entrenador personal', included: false },
          { label: 'Nutricionista profesional', included: false },
        ],
        routines: ['Capitán América (hombres)', 'Capitana Marvel (mujeres)'],
        ctaLabel: 'Consultar',
        seed: 47,
      },
      {
        id: 'rutina-thor',
        name: 'Rutina Thor / Fénix',
        tagline: 'Ya con entrenador personal',
        price: 420,
        currency: 'Bs',
        period: 'mensual',
        featured: false,
        features: [
          { label: 'Entrenador personal', included: true },
          { label: '2 pre-entrenos semanales', included: true },
          { label: '1 batido semanal', included: true },
          { label: 'Nutricionista profesional', included: false },
        ],
        routines: ['Thor (hombres)', 'Fénix (mujeres)'],
        ctaLabel: 'Consultar',
        seed: 63,
      },
      {
        id: 'rutina-hulk',
        name: 'Rutina Hulk / Mujer Maravilla',
        tagline: 'Entrenador personal y nutricionista profesional',
        price: 500,
        currency: 'Bs',
        period: 'mensual',
        featured: true,
        badge: 'Completo',
        features: [
          { label: 'Entrenador personal', included: true },
          { label: '2 pre-entrenos semanales', included: true },
          { label: '1 batido semanal', included: true },
          { label: 'Nutricionista profesional', included: true },
        ],
        routines: ['Hulk (hombres)', 'Mujer Maravilla (mujeres)'],
        ctaLabel: 'Consultar',
        seed: 79,
      },
      {
        id: 'rutina-avengers',
        name: 'Rutina Avengers Unidas',
        tagline: 'El programa más completo del gimnasio',
        price: 550,
        currency: 'Bs',
        period: 'mensual',
        featured: false,
        // El tarifario oficial da el precio y no desglosa las prestaciones.
        // Se dice eso, en vez de copiar las de otra rutina.
        features: [{ label: 'Consulta en recepción todo lo que incluye', included: true }],
        routines: ['Avengers Unidas'],
        ctaLabel: 'Consultar',
        seed: 91,
      },
    ],

    products: [
      {
        id: 'indumentaria',
        name: 'Poleras y ropa deportiva',
        description: 'Indumentaria de la casa, con diseño propio.',
        icon: 'sparkle',
        items: [
          { id: 'polera-blanca', name: 'Polera blanca con diseño', price: 35, currency: 'Bs' },
          {
            id: 'polera-negra',
            name: 'Polera negra con diseño',
            price: 40,
            currency: 'Bs',
          },
        ],
      },
      {
        id: 'suplementos',
        name: 'Suplementos deportivos',
        description:
          'Proteínas, pre-entrenos, aminoácidos y más para potenciar tus resultados.',
        icon: 'nutrition',
        items: [
          { id: 'atp-force', name: 'ATP Force', price: 250, currency: 'Bs' },
          { id: 'fema-trope', name: 'Fema Trope', price: 290, currency: 'Bs' },
          { id: 'dry-up', name: 'Dry Up', price: 290, currency: 'Bs' },
          { id: 'hydra', name: 'Hydra', price: 300, currency: 'Bs' },
          {
            id: 'pre-entreno-venom',
            name: 'Pre-entreno Venom',
            price: 350,
            currency: 'Bs',
          },
          { id: 'creatina', name: 'Creatina', price: 370, currency: 'Bs' },
          {
            id: 'proteina',
            name: 'Proteína',
            price: 460,
            currency: 'Bs',
          },
        ],
      },
      {
        id: 'accesorios',
        name: 'Accesorios de entrenamiento',
        description: 'Equipo y accesorios para mejorar tu entrenamiento y estilo.',
        icon: 'dumbbell',
        items: [
          { id: 'tomatodo-pequeno', name: 'Tomatodo pequeño', price: 50, currency: 'Bs' },
          { id: 'tomatodo-grande', name: 'Tomatodo grande', price: 70, currency: 'Bs' },
          { id: 'shaker', name: 'Shaker', price: 120, currency: 'Bs' },
        ],
      },
    ],

    /**
     * Instalaciones repartidas por sede: las que declaran `branchCode` salen en
     * la pestaña de su sucursal, y las que no lo declaran se repiten en todas
     * porque las hay en cualquiera de las dos.
     *
     * PENDIENTE: `area` y `stats` van vacíos a propósito. El gimnasio no ha
     * entregado metros ni número de equipos, y la sección está preparada para
     * no anunciar un «0 m²» que nadie midió.
     */
    facilities: [
      {
        id: 'pesas-prado',
        name: 'Sala de pesas',
        description:
          'La planta principal de la sede del Centro: peso libre, máquinas y el espacio donde se entrena la fuerza con seguimiento de los entrenadores.',
        area: '',
        icon: 'dumbbell',
        stats: [],
        branchCode: 'PRADO',
      },
      {
        id: 'cardio-prado',
        name: 'Zona de cardio',
        description:
          'Cintas, elípticos y bicicletas para el trabajo aeróbico, dentro del mismo horario extendido de 07:00 a 23:00.',
        area: '',
        icon: 'heart',
        stats: [],
        branchCode: 'PRADO',
      },
      {
        id: 'salon-prado',
        name: 'Salón de clases',
        description:
          'Donde se dictan baile urbano, Fight DO, heels y danza árabe de la sede del Centro, de lunes a viernes por la tarde y la noche.',
        area: '',
        icon: 'group',
        stats: [],
        branchCode: 'PRADO',
      },
      {
        id: 'pesas-miraflores',
        name: 'Sala de pesas',
        description:
          'La sala de Mítico Fitness Life, en Miraflores, con el mismo trabajo de fuerza y seguimiento personalizado de la casa.',
        area: '',
        icon: 'dumbbell',
        stats: [],
        branchCode: 'MIRAFLORES',
      },
      {
        id: 'cardio-miraflores',
        name: 'Zona de cardio',
        description:
          'Trabajo aeróbico en la sede que además abre los domingos por la mañana, de 08:00 a 14:00.',
        area: '',
        icon: 'heart',
        stats: [],
        branchCode: 'MIRAFLORES',
      },
      {
        id: 'salon-miraflores',
        name: 'Salón de baile',
        description:
          'La sala de Miraflores: baile urbano por la tarde, baile fitness, Fight DO y danza árabe, con su propio horario semanal.',
        area: '',
        icon: 'group',
        stats: [],
        branchCode: 'MIRAFLORES',
      },
      {
        id: 'vestuarios',
        name: 'Vestuarios',
        description: 'Vestuarios con casilleros y duchas. Los hay en las dos sedes.',
        area: '',
        icon: 'shield',
        stats: [],
      },
      {
        id: 'mostrador',
        name: 'Mostrador y suplementación',
        description:
          'Recepción, información de paquetes y la venta de proteína, creatina, pre-entrenos, shakers y la ropa deportiva de la casa.',
        area: '',
        icon: 'sparkle',
        stats: [],
      },
    ],

    /**
     * Clases dirigidas, del documento oficial de horarios. Cada franja dice en
     * qué sede se dicta, y esa es la única razón por la que la agenda puede
     * presentarse por sucursal sin que ninguna página sepa cuántas sedes hay.
     */
    classes: [
      {
        id: 'baile-urbano',
        name: 'Baile urbano',
        description:
          'Coreografía y ritmo urbano. Se dicta en las dos sedes, por la tarde: en Miraflores a las 16:00 y en el Centro a las 18:00.',
        category: 'baile',
        level: 'todos',
        horarios: [
          { weekday: 1, startTime: '18:00', endTime: '19:30', branchCode: 'PRADO' },
          { weekday: 3, startTime: '18:00', endTime: '19:30', branchCode: 'PRADO' },
          { weekday: 1, startTime: '16:00', endTime: '17:30', branchCode: 'MIRAFLORES' },
          { weekday: 3, startTime: '16:00', endTime: '17:30', branchCode: 'MIRAFLORES' },
        ],
        seed: 12,
      },
      {
        id: 'fight-do',
        name: 'Fight DO',
        description:
          'Entrenamiento de combate coreografiado: cardio, fuerza y técnica sobre una misma clase.',
        category: 'combate',
        level: 'todos',
        horarios: [
          { weekday: 1, startTime: '17:00', endTime: '18:00', branchCode: 'PRADO' },
          { weekday: 3, startTime: '19:30', endTime: '20:30', branchCode: 'PRADO' },
          { weekday: 2, startTime: '19:00', endTime: '20:00', branchCode: 'MIRAFLORES' },
          { weekday: 4, startTime: '19:00', endTime: '20:00', branchCode: 'MIRAFLORES' },
        ],
        seed: 28,
      },
      {
        id: 'heels',
        name: 'Heels',
        description:
          'Baile en tacones: técnica, postura y actitud. En la sede del Centro hay dos turnos seguidos, martes y jueves.',
        category: 'baile',
        level: 'todos',
        horarios: [
          { weekday: 2, startTime: '18:00', endTime: '19:30', branchCode: 'PRADO' },
          { weekday: 2, startTime: '19:30', endTime: '21:00', branchCode: 'PRADO' },
          { weekday: 4, startTime: '18:00', endTime: '19:30', branchCode: 'PRADO' },
          { weekday: 4, startTime: '19:30', endTime: '21:00', branchCode: 'PRADO' },
        ],
        note: 'En Mítico Fitness Life (Miraflores), consulta los horarios de heels en recepción.',
        seed: 44,
      },
      {
        id: 'danza-arabe',
        name: 'Danza árabe',
        description:
          'Trabajo de cadera, coordinación y expresión. Miércoles y viernes en las dos sedes, a distinta hora.',
        category: 'baile',
        level: 'todos',
        horarios: [
          { weekday: 3, startTime: '20:30', endTime: '21:30', branchCode: 'PRADO' },
          { weekday: 5, startTime: '20:30', endTime: '21:30', branchCode: 'PRADO' },
          { weekday: 3, startTime: '18:00', endTime: '19:00', branchCode: 'MIRAFLORES' },
          { weekday: 5, startTime: '18:00', endTime: '19:00', branchCode: 'MIRAFLORES' },
        ],
        seed: 60,
      },
      {
        id: 'baile-fitness',
        name: 'Baile fitness',
        description:
          'Cardio bailado, en Mítico Fitness Life. El martes es la única clase de la mañana de toda la semana.',
        category: 'fit',
        level: 'todos',
        horarios: [
          // El documento oficial solo publica la hora de inicio del martes.
          { weekday: 2, startTime: '11:00', branchCode: 'MIRAFLORES' },
          { weekday: 3, startTime: '19:00', endTime: '20:00', branchCode: 'MIRAFLORES' },
        ],
        note: 'La clase del martes empieza a las 11:00; confirma en recepción a qué hora termina.',
        seed: 76,
      },
    ],

    // PENDIENTE: fotografías reales del gimnasio. Mientras no lleguen, cada
    // pieza usa la composición generativa de marca en vez de una imagen rota.
    gallery: [
      { id: 'g1', title: 'Sala de pesas', caption: 'Sede Centro, El Prado', span: 2, seed: 11 },
      { id: 'g2', title: 'Zona de fuerza', caption: 'Peso libre y máquinas', span: 1, seed: 27 },
      { id: 'g3', title: 'Salón de clases', caption: 'Baile urbano, tarde de lunes', span: 1, seed: 42 },
      { id: 'g4', title: 'Fight DO', caption: 'Combate coreografiado', span: 1, seed: 58 },
      { id: 'g5', title: 'Mítico Fitness Life', caption: 'Sede Miraflores', span: 2, seed: 73 },
      { id: 'g6', title: 'Danza árabe', caption: 'Miércoles y viernes', span: 1, seed: 89 },
      { id: 'g7', title: 'Mostrador', caption: 'Suplementación y ropa de la casa', span: 1, seed: 104 },
      { id: 'g8', title: 'Heels', caption: 'Martes y jueves, dos turnos', span: 1, seed: 120 },
    ],

    // Sin datos confirmados no se publica: ver la nota de cabecera.
    team: [],
    testimonials: [],

    faq: [
      {
        id: 'sucursales',
        tags: ['horarios'],
        question: '¿Puedo entrenar en las dos sedes?',
        answer:
          'Con los paquetes Life y con los que traen «entrada a dos sucursales», sí: entrenas tanto en la sede del Centro (El Prado) como en Mítico Fitness Life (Miraflores). Los paquetes de una sola sucursal valen en la que elijas al contratar.',
      },
      {
        id: 'empezar',
        question: '¿Cuánto cuesta empezar?',
        answer:
          'La sesión suelta cuesta 30 Bs y te da acceso completo al gimnasio por un día. Si prefieres el mes, el Paquete Básico está en 180 Bs e incluye entrenamiento personalizado; el Básico Life, en 200 Bs, añade la entrada a las dos sucursales.',
      },
      {
        id: 'horarios',
        tags: ['horarios'],
        question: '¿A qué hora abren?',
        answer:
          'Las dos sedes abren de lunes a viernes de 07:00 a 23:00. Los sábados, el Centro de 09:00 a 22:00 y Miraflores de 08:00 a 22:00. Miraflores abre además los domingos, de 08:00 a 14:00.',
      },
      {
        id: 'pago',
        question: '¿Cómo puedo pagar?',
        answer:
          'El pago se hace en recepción. Si tienes dudas sobre qué paquete te conviene, escríbenos por WhatsApp al 77700867 (Centro) o al 78992777 (Miraflores) y te asesoramos antes.',
      },
      {
        id: 'personalizado',
        question: '¿Qué incluye el entrenamiento personalizado?',
        answer:
          'Hay seis rutinas, de 240 a 550 Bs al mes. Todas incluyen entrenamiento personalizado y batido semanal; de la rutina Thor / Fénix en adelante sumas entrenador personal, y la Hulk / Mujer Maravilla incluye además nutricionista profesional.',
      },
      {
        id: 'rutinas',
        question: '¿Qué son las rutinas con nombre de superhéroe?',
        answer:
          'Cada programa de entrenamiento personalizado trae su rutina asignada —Spiderman y Viuda Negra, Batman y Gamora, Thor y Fénix, Hulk y Mujer Maravilla, entre otras—. El nombre marca el nivel y el enfoque del programa que vas a seguir.',
      },
      {
        id: 'clases',
        tags: ['horarios'],
        question: '¿Qué clases dirigidas hay?',
        answer:
          'Baile urbano, Fight DO, heels y danza árabe, y baile fitness en Miraflores. Van dentro de los paquetes Dance, Mítico Fitness y Mítico Dance: no se pagan aparte. Cada sede tiene su propio horario, que puedes ver en la página de clases.',
      },
      {
        id: 'suplementos',
        question: '¿Venden suplementos y productos?',
        answer:
          'Sí, en el mostrador del gimnasio. Tenemos proteína, creatina, pre-entrenos, hidratación, shakers, tomatodos y las poleras de la casa. Consúltanos por WhatsApp y te decimos qué hay disponible.',
      },
    ],

    closingCta: {
      title: '¡Vamos con todo!',
      subtitle:
        'El dolor que sientes hoy es la fuerza que tendrás mañana. Te esperamos en el Centro o en Miraflores: escríbenos y armamos tu plan.',
      label: 'Consultar por WhatsApp',
    },

    /**
     * Las dos sedes, completas. En esta versión no hay panel ni base: los datos
     * de puerta y el texto comercial de cada sucursal viven aquí, juntos.
     */
    branches: {
      eyebrow: 'Nuestras sucursales',
      title: 'Dos sedes,',
      titleAccent: 'una sola forma de entrenar',
      lead: 'Entrena en el Centro o en Miraflores. Cada sede tiene su horario y su agenda de clases, y hay paquetes que valen en las dos.',
      benefits: [
        {
          title: 'Paquetes para las dos sedes',
          description: 'Los paquetes Life y los de «dos sucursales» te dejan entrenar en cualquiera de ellas.',
          icon: 'shield',
        },
        {
          title: 'Cada sede, su agenda',
          description: 'Las clases dirigidas tienen horario propio en cada sucursal: elige la que te quede mejor.',
          icon: 'calendar',
        },
        {
          title: 'El mismo método',
          description: 'Entrenamiento personalizado, seguimiento y rutinas asignadas en las dos sedes.',
          icon: 'trainer',
        },
      ],
      sedes: [
        {
          code: 'PRADO',
          name: 'Centro · El Prado',
          tagline: 'El clásico del centro',
          description:
            'Nuestra casa de siempre, en el Prado. Sala de pesas completa, entrenamiento personalizado y el salón donde se dictan baile urbano, Fight DO, heels y danza árabe. Ideal si estudias o trabajas en el centro.',
          highlights: [
            'Sala de pesas y máquinas completas',
            'Entrenadores con seguimiento personal',
            'Cuatro disciplinas dirigidas',
            'Suplementos y productos en mostrador',
          ],
          // PENDIENTE: dirección postal exacta. El documento oficial solo indica
          // la zona, y eso es lo que se publica hasta que el cliente la confirme.
          address: 'Zona Centro, El Prado · La Paz',
          phone: '77700867',
          whatsapp: '59177700867',
          week: [...SEMANA_CENTRO],
          isPrimary: true,
          seed: 41,
          mapEmbedUrl: 'https://www.google.com/maps?q=Fuente+del+Prado,+Plaza+del+Estudiante,+La+Paz,+Bolivia&z=17&output=embed',
        },
        {
          code: 'MIRAFLORES',
          name: 'Miraflores · Mítico Fitness Life',
          tagline: 'La casa que abre los domingos',
          description:
            'Mítico Fitness Life, en Miraflores. Misma forma de entrenar, agenda de clases propia —con baile fitness por la mañana— y la única sede que abre los domingos.',
          highlights: [
            'Abierta también los domingos',
            'Baile fitness los martes por la mañana',
            'Baile urbano, Fight DO y danza árabe',
            'Entrenamiento personalizado y seguimiento',
          ],
          // PENDIENTE: dirección postal exacta, igual que en la sede del Centro.
          address: 'Zona Miraflores · La Paz',
          phone: '78992777',
          whatsapp: '59178992777',
          week: [...SEMANA_MIRAFLORES],
          scheduleNote: 'Única sede con atención los domingos.',
          isPrimary: false,
          seed: 88,
          mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3825.493236614189!2d-68.12132532394281!3d-16.501178440757496!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x915f205d5124ee37%3A0x7a75a99d90ecaa6b!2sEdificio%20Torre%20Vicenta!5e0!3m2!1ses-419!2sbo!4v1789626586368!5m2!1ses-419!2sbo',
        },
      ],
    },
  },
};
