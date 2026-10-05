# React/MUI Frontend Kit Development Skills

## Purpose
This document provides the foundational development rules, architectural guidelines, and component reuse patterns for building new features within this React/MUI frontend kit. It ensures that all future development maintains the original design language, avoids unnecessary code duplication, and adheres to established React principles.

Before writing any new UI code, you must consult this document.

## Frappe Integration & Reference Workflow (CRITICAL)
This UI kit is configured as a **Reference Library** alongside a Frappe (Doppio) React app.
- The active working application is located in `../perfect/`.
- This repository (the UI Kit) is purely for reference and copying.
- The `../perfect/` app was initialized using the `starterkit`.

**When asked to build a new UI component for the Frappe app:**
1. Look inside `react/packages/javascript/main/src` (in this reference repo).
2. If a suitable complex component (e.g., an eCommerce table, a Kanban board, a specialized DashboardCard) exists, **copy only the necessary files** into `../perfect/src/` and integrate them.
3. Hook up the Frappe backend (via `frappe-react-sdk`) to the copied components, replacing mock data and Axios calls.
4. **DO NOT** modify the files in this reference repository. All active development must happen in `../perfect/`.

## Core Development Rules
1. **Reuse First**: Always search the existing codebase (or reference library) for equivalent or similar components before creating new ones.
2. **Permission for Custom UI**: If a required UI element cannot be satisfied by existing components, you **must ask for explicit permission** before creating a custom component from scratch.
3. **Preserve the Visual Language**: All new features must seamlessly blend with the existing UI, utilizing the defined theme colors, typography, border radii, and shadows.
4. **Follow the Architecture**: Respect the existing folder structure, routing, state management (Redux Toolkit), and styling approaches (MUI Theme).
5. **Respect Package Versions**: Always verify and prefer the exact versions of dependencies already defined in the package (`package.json`). Do not upgrade or arbitrarily install different versions of libraries without ensuring compatibility with the kit.

## React Principles
When developing new features, adhere strictly to the following React best practices:
- Prefer reusable components over duplicated JSX markup.
- Compose smaller, focused components to build complex UIs.
- Avoid unnecessarily large or monolithic components.
- Use `props` effectively, but avoid deep prop drilling by utilizing the existing Redux state or Context where appropriate.
- Avoid unnecessary `useEffect` hooks and derived state.
- Optimize for performance by preventing unnecessary re-renders.

## MUI Principles
This project uses **Material UI v6** with extensive theme customization.
- **Do not introduce other CSS frameworks** (e.g., Tailwind, Bootstrap).
- Avoid raw CSS or inline styles where MUI's `sx` prop or customized theme tokens can be used.
- Component styling overrides are managed globally via `theme/Components.js`.
- Utilize the `@mui/icons-material` and `@tabler/icons-react` packages for iconography.

## Design System

### Theme
The theme is highly dynamic and managed by the Redux `customizer` slice (in `src/store`).
- **Configuration**: The theme is constructed in `src/theme/Theme.js`.
- **Mode Toggle**: Supports Light and Dark modes (`LightThemeColors.js`, `DarkThemeColors.js`).
- **Base Mode**: Combines base settings, shadows, and localization dynamically based on user preferences.

### Typography & Colors
Defined in `src/theme/Typography.js` and `src/theme/DefaultColors.js`.
- Headings use `600` font weight. Body text uses `400`.
- **Primary**: `#5D87FF`, **Success**: `#13DEB9`, **Error**: `#FA896B`.
*Note: Always use `theme.palette.primary.main`, `theme.palette.success.main`, etc., rather than hardcoding hex values.*

## Component Architecture
The project strictly separates generic reusable UI components from page-specific layout components.
- `src/components/shared/`: Core generic layout containers (Cards, Dialogs).
- `src/components/forms/theme-elements/`: Customized MUI form inputs.
- `src/layouts/`: The structural shells of the application.
- `src/views/`: Page-level components.

## Existing Component Inventory (Found in Reference Library)

### Card Components (Use instead of standard MUI Card)
Located in `components/shared/`:
- **`DashboardCard`**: Standard wrapper for dashboard widgets/panels. Handles titles/actions.
- **`BlankCard`**: Base card with customized elevation/borders but no pre-configured padding.
- **`AppCard`**, **`BaseCard`**, **`ChildCard`**, **`WidgetCard`**

### Form Components (Use instead of standard MUI inputs)
Located in `components/forms/theme-elements/`:
- **`CustomTextField`**, **`CustomSelect`**, **`CustomCheckbox`**, **`CustomSwitch`**, **`CustomOutlinedButton`**

### Table Components
Examples of pre-built `@tanstack/react-table` variants are in `views/react-tables/`.

## Final Checklist for Agents
- [ ] Are you making changes in `../perfect/` and NOT in the reference repo?
- [ ] Did you check the reference repo's `components/shared/` before building this UI?
- [ ] Are you using theme tokens (e.g., `theme.palette.primary.main`) instead of hex codes?
- [ ] If you created a brand new custom UI component, did you ask for permission first?
