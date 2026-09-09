/**
 * CONFIGURACIÓN DE TENANT — MÍTICO FITNESS
 *
 * Este archivo es el único artefacto que define cómo se ve y qué dice el sitio
 * de Mítico Fitness. No existe ningún componente, ruta ni hoja de estilo
 * específica de este cliente.
 *
 * Paleta oficial (manual de marca):
 *   Neón Eléctrico    #39FF14  — acción, foco, énfasis
 *   Negro Carbón      #1A1C1E  — superficie de tarjeta
 *   Verde Estructural #38761D  — bloques y tarjetas de servicio
 *   Verde de Barra    #1E5128  — barras de título y controles superiores
 *   Blanco / Gris     #FFFFFF / #C1C1C1 — texto y detalles sutiles
 */

import type { TenantConfig } from '@core/domain/tenant/tenant-config';
import { DEFAULT_FEATURE_FLAGS } from '@core/domain/tenant/feature-flags';

export const miticoTenant: TenantConfig = {
  slug: 'mitico',
  name: 'Mítico Fitness',
  legalName: 'Mítico Fitness S.R.L.',
  tagline: 'Entrená como una leyenda',

  domains: ['miticofitness.com', 'www.miticofitness.com'],

  branding: {
    mode: 'dark',
    logo: {
      wordmark: 'Mítico',
      subMark: 'Fitness',
      monogram: 'M',
    },
    palette: {
      primary: '#39FF14',
      primaryStrong: '#2BD40D',
      structural: '#38761D',
      structuralDeep: '#1E5128',
      surface: '#0C0E0F',
      surfaceRaised: '#131617',
      surfaceCard: '#1A1C1E',
      text: '#FFFFFF',
      textMuted: '#9BA49B',
      border: '#252A26',
      accent: '#C1C1C1',
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
      glowIntensity: 1,
      showGrid: true,
    },
  },

  contact: {
    phone: '+591 700 12345',
    whatsapp: '59170012345',
    whatsappMessage:
      'Hola Mítico Fitness 👋 Quiero información sobre las membresías y el pase de prueba.',
    email: 'hola@miticofitness.com',
    addressLine: 'Av. Banzer 3er Anillo, Calle Los Cusis #240',
    city: 'Santa Cruz de la Sierra',
    country: 'Bolivia',
    mapEmbedUrl: '',
    mapLinkUrl: '',
  },

  social: {
    instagram: '',
    facebook: '',
    tiktok: '',
    youtube: '',
  },

  hours: {
    timezone: 'America/La_Paz',
    week: [
      { day: 'Lunes', open: '05:30', close: '23:00', closed: false },
      { day: 'Martes', open: '05:30', close: '23:00', closed: false },
      { day: 'Miércoles', open: '05:30', close: '23:00', closed: false },
      { day: 'Jueves', open: '05:30', close: '23:00', closed: false },
      { day: 'Viernes', open: '05:30', close: '23:00', closed: false },
      { day: 'Sábado', open: '07:00', close: '20:00', closed: false, note: 'Horario continuo' },
      { day: 'Domingo', open: '08:00', close: '14:00', closed: false, note: 'Solo sala de pesas' },
    ],
    holidayNote: 'Feriados nacionales: 08:00 a 13:00. Se anuncia por redes con 48 h de aviso.',
  },

  navigation: [
    { label: 'Inicio', segment: '' },
    { label: 'Nosotros', segment: 'nosotros' },
    { label: 'Servicios', segment: 'servicios' },
    { label: 'Planes', segment: 'planes', requiresFeature: 'showPlans' },
    { label: 'Instalaciones', segment: 'instalaciones', requiresFeature: 'showFacilities' },
    { label: 'Galería', segment: 'galeria', requiresFeature: 'showGallery' },
    { label: 'Horarios', segment: 'horarios', requiresFeature: 'showSchedule' },
    { label: 'Contacto', segment: 'contacto' },
  ],

  features: {
    ...DEFAULT_FEATURE_FLAGS,
    showTeam: true,
    showLocationMap: true,
  },

  seo: {
    title: 'Mítico Fitness — Entrená como una leyenda',
    titleTemplate: '%s | Mítico Fitness',
    description:
      'Gimnasio premium en Santa Cruz de la Sierra. Musculación, funcional, clases grupales y entrenamiento personalizado con equipamiento de primer nivel y acompañamiento profesional.',
    keywords: [
      'gimnasio santa cruz',
      'mítico fitness',
      'entrenamiento funcional',
      'musculación',
      'clases grupales',
      'entrenador personal',
    ],
    locale: 'es_BO',
  },

  provisioning: {
    plan: 'professional',
    activeSince: '2026-01-15',
    status: 'active',
  },

  content: {
    hero: {
      eyebrow: 'Santa Cruz de la Sierra · Desde 2019',
      title: 'Forjá tu',
      titleAccent: 'versión mítica',
      subtitle:
        'Más de 1.200 m² de equipamiento premium, entrenadores certificados y una comunidad que no te deja aflojar. Tu primera semana es de cortesía.',
      primaryCta: { label: 'Ver planes', segment: 'planes' },
      secondaryCta: { label: 'Conocer el gimnasio', segment: 'instalaciones' },
      stats: [
        { value: '1.200', label: 'm² de entrenamiento' },
        { value: '+2.400', label: 'socios activos' },
        { value: '18', label: 'clases semanales' },
        { value: '6', label: 'años de trayectoria' },
      ],
    },

    about: {
      eyebrow: 'Nosotros',
      title: 'No vendemos membresías. Construimos hábitos.',
      lead:
        'Mítico nació en 2019 con una idea simple y difícil: que entrenar deje de ser una obligación y se convierta en la mejor hora de tu día.',
      paragraphs: [
        'Empezamos con 180 m², catorce máquinas y una lista de espera que no dejaba de crecer. Seis años después ocupamos tres plantas sobre la Av. Banzer, pero seguimos midiendo el éxito de la misma manera: por la cantidad de socios que siguen entrenando con nosotros después del tercer año.',
        'Cada persona que se inscribe pasa por una evaluación inicial sin costo. Medimos composición corporal, movilidad y antecedentes, y recién entonces armamos una rutina. No creemos en el plan genérico que se le entrega a todo el mundo por igual: el cuerpo que entra por la puerta nunca es el mismo que el anterior.',
        'Nuestro equipo se forma de manera continua. Todos los entrenadores tienen certificación vigente y revisan sus programas cada trimestre con nuestro coordinador metodológico. Es más caro y más lento. También es la razón por la que la gente se queda.',
      ],
      values: [
        {
          title: 'Método antes que moda',
          description:
            'Programación basada en evidencia, con progresiones medibles. Nada de tendencias que duran un verano.',
          icon: 'shield',
        },
        {
          title: 'Acompañamiento real',
          description:
            'Un entrenador en sala en todo momento. Si estás haciendo mal un movimiento, alguien te lo va a corregir.',
          icon: 'trainer',
        },
        {
          title: 'Comunidad que sostiene',
          description:
            'Grupos por objetivo, retos mensuales y un ambiente donde el principiante entrena al lado del avanzado sin sentirse fuera de lugar.',
          icon: 'group',
        },
        {
          title: 'Equipamiento serio',
          description:
            'Máquinas de marcas líderes con mantenimiento preventivo mensual documentado. Si algo falla, se repara esa semana.',
          icon: 'dumbbell',
        },
      ],
      milestones: [
        { year: '2019', text: 'Abrimos la primera sala de 180 m² con catorce máquinas.' },
        { year: '2021', text: 'Sumamos el área funcional y las primeras clases grupales.' },
        { year: '2023', text: 'Mudanza a la sede actual sobre Av. Banzer: 1.200 m² en tres plantas.' },
        { year: '2025', text: 'Incorporamos evaluación de composición corporal para todos los socios.' },
        { year: '2026', text: 'Más de 2.400 socios activos y un equipo de 22 profesionales.' },
      ],
    },

    services: [
      {
        id: 'musculacion',
        name: 'Musculación',
        summary: 'Sala de pesas con equipamiento profesional y programación individual.',
        description:
          'Peso libre, máquinas guiadas y zona de fuerza con plataformas olímpicas. Cada socio recibe una rutina progresiva revisada cada seis semanas según su avance real, no según el calendario.',
        icon: 'dumbbell',
        highlights: ['4 racks de potencia', 'Mancuernas de 2 a 50 kg', 'Rutina revisada cada 6 semanas'],
      },
      {
        id: 'funcional',
        name: 'Entrenamiento funcional',
        summary: 'Circuitos de alta intensidad orientados al movimiento cotidiano.',
        description:
          'Trabajo con kettlebells, cuerdas, trineos y peso corporal en un área dedicada de 300 m². Ideal si buscás mejorar resistencia, coordinación y composición corporal sin pasar dos horas en sala.',
        icon: 'boxing',
        highlights: ['Sesiones de 45 minutos', 'Grupos de máximo 12 personas', 'Tres niveles de intensidad'],
      },
      {
        id: 'clases',
        name: 'Clases grupales',
        summary: 'Dieciocho clases semanales incluidas en todos los planes mensuales.',
        description:
          'Spinning, GAP, HIIT, yoga y movilidad. Todas dictadas por instructores certificados, con cupo controlado para que nadie entrene apretado ni sin supervisión.',
        icon: 'group',
        highlights: ['18 clases por semana', 'Reserva desde el mostrador', 'Sin costo adicional'],
      },
      {
        id: 'personalizado',
        name: 'Entrenamiento personalizado',
        summary: 'Un entrenador dedicado, sesión a sesión, con seguimiento documentado.',
        description:
          'Para quien vuelve de una lesión, prepara una competencia o simplemente necesita que alguien lleve el registro. Incluye planificación mensual, control de cargas y ajuste según respuesta.',
        icon: 'trainer',
        highlights: ['1 a 1 o en dupla', 'Planificación mensual escrita', 'Control de cargas y progreso'],
      },
      {
        id: 'nutricion',
        name: 'Asesoría nutricional',
        summary: 'Plan alimentario compatible con tu entrenamiento y tu vida real.',
        description:
          'Consultas con nutricionista deportivo dentro del gimnasio. Trabajamos sobre lo que efectivamente comés y comprás, no sobre una dieta ideal que se abandona en dos semanas.',
        icon: 'nutrition',
        highlights: ['Evaluación de composición corporal', 'Plan ajustado cada mes', 'Incluido en plan Leyenda'],
      },
      {
        id: 'recuperacion',
        name: 'Zona de recuperación',
        summary: 'Movilidad, estiramiento asistido y masaje deportivo.',
        description:
          'Un área que la mayoría de los gimnasios no tiene y que explica buena parte de la continuidad de nuestros socios: entrenar fuerte sirve de poco si no se recupera bien.',
        icon: 'spa',
        highlights: ['Estiramiento asistido', 'Masaje deportivo con turno', 'Rodillos y bandas libres'],
      },
    ],

    plans: [
      {
        id: 'inicio',
        name: 'Inicio',
        tagline: 'Para empezar sin vueltas',
        price: 180,
        currency: 'Bs',
        period: 'mensual',
        featured: false,
        features: [
          { label: 'Acceso libre a sala de pesas', included: true },
          { label: 'Rutina inicial personalizada', included: true },
          { label: 'Evaluación de composición corporal', included: true },
          { label: 'Acceso en horario completo', included: true },
          { label: 'Clases grupales', included: false },
          { label: 'Zona de recuperación', included: false },
          { label: 'Asesoría nutricional', included: false },
        ],
        ctaLabel: 'Empezar ahora',
      },
      {
        id: 'atleta',
        name: 'Atleta',
        tagline: 'El plan que elige el 70% de nuestros socios',
        price: 260,
        currency: 'Bs',
        period: 'mensual',
        compareAtPrice: 320,
        featured: true,
        badge: 'Más elegido',
        features: [
          { label: 'Todo lo del plan Inicio', included: true },
          { label: 'Las 18 clases grupales semanales', included: true },
          { label: 'Zona de recuperación y movilidad', included: true },
          { label: 'Reprogramación de rutina cada 6 semanas', included: true },
          { label: 'Invitá a un amigo una vez al mes', included: true },
          { label: 'Asesoría nutricional', included: false },
          { label: 'Entrenamiento personalizado', included: false },
        ],
        ctaLabel: 'Quiero este plan',
      },
      {
        id: 'leyenda',
        name: 'Leyenda',
        tagline: 'Acompañamiento completo, sin techo',
        price: 420,
        currency: 'Bs',
        period: 'mensual',
        featured: false,
        badge: 'Premium',
        features: [
          { label: 'Todo lo del plan Atleta', included: true },
          { label: '4 sesiones personalizadas al mes', included: true },
          { label: 'Asesoría nutricional mensual', included: true },
          { label: 'Masaje deportivo quincenal', included: true },
          { label: 'Acceso prioritario a clases con cupo', included: true },
          { label: 'Congelamiento de membresía hasta 15 días', included: true },
          { label: 'Casillero personal asignado', included: true },
        ],
        ctaLabel: 'Hablar con un asesor',
      },
    ],
    plansNote:
      'Todos los planes incluyen la primera semana de cortesía y la evaluación inicial sin costo. Sin matrícula de inscripción ni permanencia mínima: si no te convence, se cancela y listo.',

    facilities: [
      {
        id: 'sala-pesas',
        name: 'Sala de pesas',
        description:
          'Planta principal de 520 m² con equipamiento de marcas líderes, cuatro racks de potencia y una zona de peso libre que no se satura ni en hora pico.',
        area: '520 m²',
        icon: 'dumbbell',
        stats: [
          { label: 'Racks de potencia', value: '4' },
          { label: 'Estaciones', value: '62' },
          { label: 'Mancuernas', value: '2–50 kg' },
        ],
      },
      {
        id: 'funcional',
        name: 'Área funcional',
        description:
          'Espacio abierto con piso amortiguado, trineos, cuerdas de batalla y estructura de calistenia. Diseñado para circuitos y trabajo en grupo reducido.',
        area: '300 m²',
        icon: 'boxing',
        stats: [
          { label: 'Piso amortiguado', value: 'Sí' },
          { label: 'Cupo por circuito', value: '12' },
          { label: 'Kettlebells', value: '4–40 kg' },
        ],
      },
      {
        id: 'salon-clases',
        name: 'Salón de clases',
        description:
          'Sala insonorizada con espejos de pared completa, sistema de audio profesional y climatización independiente. Sede de las dieciocho clases semanales.',
        area: '180 m²',
        icon: 'group',
        stats: [
          { label: 'Capacidad', value: '28' },
          { label: 'Clases/semana', value: '18' },
          { label: 'Climatización', value: 'Independiente' },
        ],
      },
      {
        id: 'cardio',
        name: 'Zona de cardio',
        description:
          'Cintas, elípticos, remos y bicicletas de aire frente al ventanal norte. Cada equipo con pantalla propia y toma de carga.',
        area: '140 m²',
        icon: 'heart',
        stats: [
          { label: 'Equipos', value: '24' },
          { label: 'Pantalla propia', value: 'Todos' },
          { label: 'Luz natural', value: 'Ventanal norte' },
        ],
      },
      {
        id: 'recuperacion',
        name: 'Zona de recuperación',
        description:
          'Área silenciosa para movilidad, estiramiento asistido y masaje deportivo con turno previo. Rodillos, bandas y camillas disponibles.',
        area: '60 m²',
        icon: 'spa',
        stats: [
          { label: 'Camillas', value: '3' },
          { label: 'Turnos', value: 'Con reserva' },
          { label: 'Uso libre', value: 'Rodillos y bandas' },
        ],
      },
      {
        id: 'vestuarios',
        name: 'Vestuarios',
        description:
          'Vestuarios amplios con casilleros, duchas de agua caliente permanente y área de secado. Limpieza documentada tres veces al día.',
        area: '110 m²',
        icon: 'shield',
        stats: [
          { label: 'Casilleros', value: '160' },
          { label: 'Duchas', value: '12' },
          { label: 'Limpieza', value: '3×/día' },
        ],
      },
    ],

    gallery: [
      { id: 'g1', title: 'Sala principal', caption: 'Planta de pesas en horario pico', span: 2, seed: 11 },
      { id: 'g2', title: 'Zona de fuerza', caption: 'Plataformas y racks de potencia', span: 1, seed: 27 },
      { id: 'g3', title: 'Área funcional', caption: 'Circuito de alta intensidad', span: 1, seed: 42 },
      { id: 'g4', title: 'Clase de spinning', caption: 'Martes y jueves, 19:00', span: 1, seed: 58 },
      { id: 'g5', title: 'Cardio', caption: 'Ventanal norte al atardecer', span: 2, seed: 73 },
      { id: 'g6', title: 'Recuperación', caption: 'Movilidad y estiramiento asistido', span: 1, seed: 89 },
      { id: 'g7', title: 'Recepción', caption: 'Entrada sobre Av. Banzer', span: 1, seed: 104 },
      { id: 'g8', title: 'Comunidad', caption: 'Reto mensual de fin de mes', span: 1, seed: 120 },
    ],

    team: [
      {
        id: 't1',
        name: 'Camila Rojas',
        role: 'Coordinadora metodológica',
        bio: 'Licenciada en Ciencias del Deporte. Diseña y audita los programas de todos los entrenadores del equipo.',
        specialties: ['Programación de fuerza', 'Readaptación'],
        seed: 7,
      },
      {
        id: 't2',
        name: 'Diego Antelo',
        role: 'Entrenador de fuerza',
        bio: 'Ocho años en levantamiento olímpico. Lleva la zona de peso libre y la preparación de competidores.',
        specialties: ['Levantamiento olímpico', 'Powerlifting'],
        seed: 23,
      },
      {
        id: 't3',
        name: 'Valeria Suárez',
        role: 'Instructora de clases grupales',
        bio: 'Certificada en spinning, GAP y movilidad. Responsable del calendario semanal de clases.',
        specialties: ['Spinning', 'HIIT', 'Movilidad'],
        seed: 51,
      },
      {
        id: 't4',
        name: 'Martín Céspedes',
        role: 'Nutricionista deportivo',
        bio: 'Atiende dentro del gimnasio. Trabaja sobre hábitos reales y compras semanales, no sobre dietas ideales.',
        specialties: ['Composición corporal', 'Nutrición deportiva'],
        seed: 66,
      },
    ],

    testimonials: [
      {
        id: 'ts1',
        quote:
          'Llevaba años empezando y dejando gimnasios. Acá me hicieron una evaluación, me armaron algo realista y por primera vez pasé del tercer mes. Ya van dos años.',
        author: 'Andrea M.',
        context: 'Socia desde 2024 · Plan Atleta',
        rating: 5,
      },
      {
        id: 'ts2',
        quote:
          'Volví de una lesión de rodilla con miedo. Diego me armó una progresión de seis meses y no tuve una sola recaída. El seguimiento fue serio de verdad.',
        author: 'Rodrigo V.',
        context: 'Socio desde 2023 · Plan Leyenda',
        rating: 5,
      },
      {
        id: 'ts3',
        quote:
          'Lo que más valoro es que siempre hay alguien en sala. No es el gimnasio donde entrás, hacés cualquier cosa y te vas. Te corrigen.',
        author: 'Paola C.',
        context: 'Socia desde 2022 · Plan Atleta',
        rating: 5,
      },
    ],

    faq: [
      {
        id: 'f1',
        question: '¿Necesito experiencia previa para empezar?',
        answer:
          'No. Más de la mitad de quienes se inscriben nunca pisaron un gimnasio. La evaluación inicial y la rutina de arranque están pensadas exactamente para ese caso, y siempre hay un entrenador en sala para corregirte.',
      },
      {
        id: 'f2',
        question: '¿Hay permanencia mínima o matrícula de inscripción?',
        answer:
          'Ninguna de las dos. No cobramos matrícula y podés cancelar cuando quieras avisando antes del cierre del período en curso. Preferimos que te quedes porque querés, no porque firmaste.',
      },
      {
        id: 'f3',
        question: '¿Puedo probar antes de pagar?',
        answer:
          'Sí. La primera semana es de cortesía e incluye la evaluación de composición corporal y una clase grupal. Solo hace falta acercarse con documento y ropa deportiva.',
      },
      {
        id: 'f4',
        question: '¿Las clases grupales tienen costo adicional?',
        answer:
          'No para los planes Atleta y Leyenda: las dieciocho clases semanales están incluidas. En el plan Inicio se pueden tomar clases sueltas abonando por sesión.',
      },
      {
        id: 'f5',
        question: '¿Puedo congelar mi membresía si viajo?',
        answer:
          'El plan Leyenda incluye hasta 15 días de congelamiento al año. En los planes Inicio y Atleta se puede solicitar por motivo médico presentando certificado.',
      },
      {
        id: 'f6',
        question: '¿Cuál es el horario menos concurrido?',
        answer:
          'Entre las 10:00 y las 16:00 de lunes a viernes la sala está a menos de la mitad de su capacidad. El pico es de 18:00 a 21:00.',
      },
    ],

    closingCta: {
      title: 'Tu primera semana corre por nuestra cuenta',
      subtitle:
        'Vení, entrená, conocé el lugar y hablá con un entrenador. Si no es para vos, no pasa nada. Si lo es, ya sabés dónde encontrarnos.',
      label: 'Reservar mi semana de prueba',
    },
  },
};
