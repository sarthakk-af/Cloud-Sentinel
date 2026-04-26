import { createTheme } from '@mantine/core';

export const theme = createTheme({
  /* ── Typography ─────────────────────────────────────────────── */
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontFamilyMonospace: "'JetBrains Mono', 'Fira Code', monospace",
  headings: {
    fontFamily: "'Inter', -apple-system, sans-serif",
    fontWeight: '700',
  },

  /* ── Radius ─────────────────────────────────────────────────── */
  radius: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  defaultRadius: 'md',

  /* ── Primary color ──────────────────────────────────────────── */
  primaryColor: 'indigo',

  colors: {
    dark: [
      '#f8fafc',   // 0 – text-bright
      '#e2e8f0',   // 1 – text-primary
      '#94a3b8',   // 2 – text-secondary
      '#475569',   // 3 – text-dim
      '#334155',   // 4
      '#1e2130',   // 5 – bg-card
      '#1c1f28',   // 6 – bg-surface
      '#161920',   // 7 – bg-panel
      '#0f1117',   // 8 – bg-deep
      '#0a0c12',   // 9
    ],
  },

  /* ── Component overrides ────────────────────────────────────── */
  components: {
    Paper: {
      defaultProps: {
        bg: 'transparent',
        radius: 'md',
      },
      styles: () => ({
        root: {
          borderColor: 'transparent',
        },
      }),
    },

    Badge: {
      styles: () => ({
        root: {
          textTransform: 'uppercase',
          fontWeight: 600,
          letterSpacing: '0.04em',
          borderRadius: '20px',
          fontSize: '0.65rem',
        },
      }),
    },

    Button: {
      styles: () => ({
        root: {
          fontWeight: 600,
          borderRadius: '8px',
          transition: 'all 0.2s ease',
        },
      }),
    },

    Accordion: {
      styles: () => ({
        item: {
          borderColor: 'rgba(255, 255, 255, 0.06)',
          backgroundColor: '#1c1f28',
          borderRadius: '8px',
          '&[data-active]': {
            backgroundColor: '#1c1f28',
          },
        },
        control: {
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
          },
        },
        chevron: {
          color: '#475569',
        },
        content: {
          paddingTop: 0,
        },
      }),
    },

    Progress: {
      styles: () => ({
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          borderRadius: '4px',
        },
      }),
    },

    Tooltip: {
      styles: () => ({
        tooltip: {
          fontSize: '0.72rem',
          backgroundColor: '#1c1f28',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#e2e8f0',
          borderRadius: '8px',
        },
      }),
    },

    SegmentedControl: {
      styles: () => ({
        root: {
          backgroundColor: '#13151c',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        },
        label: {
          fontSize: '0.72rem',
          fontWeight: 600,
        },
      }),
    },

    Loader: {
      defaultProps: {
        color: '#6382ff',
      },
    },
  },
});
