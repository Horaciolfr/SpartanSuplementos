/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    // Escala estricta basada en Grid de 8pt (con semitonos de 4px para micro-elementos)
    spacing: {
      '0': '0px',
      '0.5': '4px',   // Micro-offset / border align
      '1': '8px',     // 1 unit (8pt)
      '1.5': '12px',
      '2': '16px',    // 2 units (16pt)
      '2.5': '20px',
      '3': '24px',    // 3 units (24pt)
      '4': '32px',    // 4 units (32pt)
      '5': '40px',    // 5 units (40pt)
      '6': '48px',    // 6 units (48pt)
      '7': '56px',    // 7 units (56pt)
      '8': '64px',    // 8 units (64pt)
      '10': '80px',   // 10 units (80pt)
      '12': '96px',   // 12 units (96pt)
      '16': '128px',  // 16 units (128pt)
      '20': '160px',  // 20 units (160pt)
      '24': '192px',  // 24 units (192pt)
    },
    // Escala de Border-Radius no uniforme (Prohibido 16px uniforme)
    borderRadius: {
      'none': '0px',      // Terminal HUD, video stream, celdas de matriz
      'xs': '2px',        // Badges de SKU, etiquetas de kárdex, scrollbar
      'sm': '4px',        // Botones de acción, inputs técnicos, selectores
      'md': '6px',        // Tarjetas de datos, widgets de telemetría
      'lg': '8px',        // Modales de confirmación ACID, drawers
      'full': '9999px',   // Indicadores de estado de nodo (pings / leds)
    },
    extend: {
      // Tipografía: Display de carácter + Mono para telemetría/tensores + Grotesk geométrico
      fontFamily: {
        'display': ['Anybody', 'Barlow Condensed', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Space Mono', 'monospace'],
        'sans': ['Hanken Grotesk', 'system-ui', 'sans-serif'],
      },
      // Escala tipográfica estricta con line-heights acoplados al grid de 8pt
      fontSize: {
        '2xs': ['10px', { lineHeight: '16px', letterSpacing: '0.05em' }], // Metadata de tensores
        'xs': ['12px', { lineHeight: '16px', letterSpacing: '0.025em' }], // Badges de tabla
        'sm': ['14px', { lineHeight: '20px' }],                            // Celdas de kárdex
        'base': ['16px', { lineHeight: '24px' }],                          // Cuerpo principal
        'lg': ['18px', { lineHeight: '24px', fontWeight: '600' }],         // Títulos de panel
        'xl': ['20px', { lineHeight: '28px', fontWeight: '700' }],         // Subtitulares
        '2xl': ['24px', { lineHeight: '32px', fontWeight: '800' }],        // Widgets KPI
        '3xl': ['32px', { lineHeight: '40px', fontWeight: '800' }],        // Números clave
        '4xl': ['40px', { lineHeight: '48px', fontWeight: '900' }],        // Títulos de módulo
        '5xl': ['48px', { lineHeight: '56px', fontWeight: '900' }],        // Portadas de pantalla
      },
      // Paleta Semántica Funcional (Dark Mode de Alto Contraste - Cero gradientes decorativos)
      colors: {
        // Superficies de Fondo y Paneles
        spartan: {
          bg: '#080808',         // Fondo absoluto obsidian
          surface: '#0E0E0E',    // Panel base de instrumentación
          panel: '#141414',      // Contenedor de cards y tablas
          elevated: '#1A1A1A',   // Modales y menús flotantes
          highlight: '#242424',  // Estados hover en filas de datos
        },
        // Bordes Tácticos Estructurados
        tactical: {
          border: '#1E1E1E',     // Separador estructural tenue
          medium: '#2A2A2A',     // Borde de componentes interactivos
          active: '#3D3D3D',     // Borde de foco/selección
        },
        // Colores Semánticos Funcionales
        biometric: {
          DEFAULT: '#00F0FF',    // Cian eléctrico: Landmarks 3D, esqueleto MediaPipe
          dim: 'rgba(0, 240, 255, 0.15)',
          glow: 'rgba(0, 240, 255, 0.35)',
        },
        acid: {
          success: '#00FF66',    // Verde neón: Transacción ACID confirmada, commit DB
          dim: 'rgba(0, 255, 102, 0.12)',
          rollback: '#FF2A55',   // Carmesí técnico: Rollback ACID, HTTP 409 quiebre
          rollbackDim: 'rgba(255, 42, 85, 0.12)',
        },
        amber: {
          warning: '#FFB703',    // Ámbar: Stock crítico, stock <= stock_seguridad
          dim: 'rgba(255, 183, 3, 0.12)',
        },
        brand: {
          gold: '#F2E500',       // Amarillo espartano: Acento primario, botones de acción
          goldHover: '#FFF01F',
          goldDim: 'rgba(242, 229, 0, 0.12)',
        },
      },
      // Elevación Táctica: Sombras nítidas con bordes de luz tenue (No difusas)
      boxShadow: {
        'elevation-0': 'none',
        'elevation-1': '0 1px 2px 0 rgba(0, 0, 0, 0.8), 0 0 0 1px #1E1E1E',
        'elevation-2': '0 4px 12px 0 rgba(0, 0, 0, 0.85), 0 0 0 1px #2A2A2A',
        'elevation-3': '0 12px 32px -4px rgba(0, 0, 0, 0.95), 0 0 0 1px #3D3D3D',
        'elevation-biometric': '0 0 16px -2px rgba(0, 240, 255, 0.3), 0 0 0 1px rgba(0, 240, 255, 0.5)',
        'elevation-acid': '0 0 16px -2px rgba(0, 255, 102, 0.3), 0 0 0 1px rgba(0, 255, 102, 0.5)',
        'elevation-gold': '0 0 20px -2px rgba(242, 229, 0, 0.25), 0 0 0 1px rgba(242, 229, 0, 0.4)',
      },
      // Animaciones Tácticas para Skeletons y Estados de Carga
      keyframes: {
        tacticalScan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
        shimmerWave: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
      },
      animation: {
        'tactical-scan': 'tacticalScan 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'shimmer-wave': 'shimmerWave 2s linear infinite',
        'pulse-subtle': 'pulseSubtle 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
