# Refactoring UI fix round: orchestrator decisions

The owner asked for every page to be reviewed with the `refactoring-ui` skill and then fixed. The audits are in
`studio/reviews/rui-<slug>.md`. Where an audit finding conflicts with PLAN.md, these decisions apply:

1. **Readability wins over the brief for small text.** Any text at 18px or below (body, labels, captions, prices,
   form text, nav) renders at weight 400 or heavier (Law 6, §2.2). Light weights (100–300) stay only on display
   text of 24px and above, where the brief uses them for the brand's voice. If a family has no 400, use its nearest
   heavier weight that exists, and update the Google Fonts link (still ≤ 2 families, keep total weights small).
2. **Every value comes from a system (Law 3).** Add a token scale to each page's `:root` (font sizes, line-heights,
   spacing, radii, shadows, text colours) and map existing values to the nearest step, as in the audit's "토큰 정리"
   section. Do it in this order: text colours and sizes, then radii and shadows, then spacing. This is a mapping,
   not a redesign: keep each page's look; compare before/after screenshots of the key screens and undo any step
   that visibly breaks a layout.
3. **Text colours on dark or coloured surfaces** are solid tokens, not white/black at lower opacity (Law 7, §2.3).
4. **One filled primary action per view (Law 8, §2.8).** When the header CTA and a section CTA are both filled and
   visible together, demote the header one (ghost/outline) while the section CTA is on screen, unless the brief
   explicitly requires both.
5. **Fix every P0 and P1.** Fix P2 where it is cheap (S effort). Cite the rule ID for each change in your reply.
6. Brand decisions the auditor listed as "not counted" stay as they are.
7. Same rules as always: BUILD-CONTRACT.md, only your own folders, no impeccable/selling-product-page invocation,
   do not commit. Re-run `node studio/tools/shoot.mjs --out studio/.shots/<slug> <page>`, look at the screenshots
   (and the 1280 / 375 widths the skill uses), keep report.json clean (0 errors, no overflow).
