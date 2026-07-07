<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:spur-hrms-ui-rules -->
# spur-hrms UI Rules

When implementing HRMS user-facing tasks, use `/Users/dinesh/workplace/setika-new/tailwind/template/src` as the visual reference and convert the relevant HTML patterns into the existing Next.js app structure.

A spur-hrms backend task is not complete until the matching frontend screen exists when the feature is user-facing. Keep auth/session handling centralized in `src/lib/auth.ts` and API calls centralized through shared helpers such as `src/lib/api.ts`; do not scatter token storage or direct Authorization header logic across pages.

Before implementing a user-facing HRMS screen, research expected HRMS market behavior and comparable product patterns for that workflow. Use the research to choose the screen structure, required fields, terminology, and edge cases, then summarize the decision in the task update or implementation notes.

Keep HRMS UI surfaces clean and compact:

- Put all create, edit, approval-comment, setup, and configuration forms in modal popups unless a dedicated multi-step wizard is clearly more usable.
- Do not show long helper text directly on pages or inside form rows. Place helper text behind an information button, tooltip, popover, or contextual help drawer.
- Keep main pages focused on summary cards, filters, status chips, lists/tables, and primary actions.
- Move secondary and advanced options into collapsed sections, tabs, or modals.
- Avoid one-screen mega forms and cluttered dashboards. Split crowded workflows into task-specific modals, tabs, or focused subviews.
- For mobile-responsive layouts, use compact action queues, stacked summaries, and bottom-sheet/modal style interactions instead of wide desktop tables.
<!-- END:spur-hrms-ui-rules -->
