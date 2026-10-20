# Project conventions

## Styling consistency

- Use one styling system consistently throughout the entire project, including pages, modals, components, shared UI, and responsive styles.
- If a project uses Tailwind CSS, implement all UI styles with Tailwind utilities and variants. Do not introduce standalone Pure CSS rules alongside Tailwind.
- If a project specifies Pure CSS, implement all UI styles with Pure CSS. Do not introduce Tailwind alongside it.
- Never mix Tailwind and Pure CSS for UI styling within the same project. Mixed styling makes the code harder to navigate and UI/CSS bugs harder to diagnose.
- **AIChatbot-Gemini uses Tailwind CSS.** Follow the Tailwind convention for all UI work in this repository.
- Existing mixed styles are not permission to add more mixed styles. Preserve this convention when creating or modifying UI.

## Shared typography

- Use the shared Tailwind class strings in `src/styles/typography.ts` for text roles (title, subtitle, header, subheading, description, and UI labels).
- Text with the same role must share its responsive font size, weight, line height, and letter spacing across pages. Do not override these per page or sidebar variant.
- Keep layout, spacing, and context-specific colors in components. Marketing display text uses the dedicated display role.
