# Style2Fit — UI work, by tier

The review list was only ever spoken in a chat session, which is why nobody
could say where we were. It lives here now. Update it as items land.

Tiers are ordered by what blocks what: Tier 0 is correctness and safety, Tier 1
is layout and information architecture, Tier 2 is the visual language, Tier 3 is
polish. A tier is not finished until every page in it has been looked at.

---

## Tier 0 — correctness and safety

| | Item | Notes |
|---|---|---|
| ✅ | `types.ts` was three lines of captured CLI output | Every Supabase query in the app was silently `any`. Hand-written from the real `select()` calls; the project typechecks for the first time. |
| ✅ | Subscriptions table had an UPDATE policy under RLS | A billing bypass — any signed-in user could mark themselves paid. Policy dropped. |
| ✅ | Orders list crashed on `shortCode(order)` | The helper takes the code string, not the order. `tsc` did **not** catch it (see the caveat below). |
| ✅ | Naira shown as `NGN 185,000` | `locale` comes from `navigator.language`, so any en-US/en-GB browser got the ISO code. Now `currencyDisplay: "narrowSymbol"` → `₦185,000`. |
| ✅ | Reset-password dialog fought Radix for focus | A second `autoFocus` on top of Radix's own focus move; on a phone it popped the keyboard and shoved the dialog off-screen. |
| ❌ | **`.env` is committed and not gitignored** | Anyone with repo access has the keys. Rotate, then gitignore. |
| ❌ | **React Query cache is not cleared on sign-out** | On a shared device, the next person to sign in sees the previous account's customers until the first refetch. |
| ❌ | No CI | Nothing runs `tsc` or the build on a push. |

> **Caveat on `tsc`:** the Supabase helpers cast through `as unknown as T`, so
> wrong arguments inside a page can still typecheck. `tsc` passing is necessary,
> not sufficient. Transform-check the pages and click them.

## Tier 1 — layout and information architecture

| | Item | Notes |
|---|---|---|
| ✅ | Content area was `max-w-6xl` inside the post-sidebar space | On a 1920 screen that left 1152px of content and 256px of dead margin either side. Now `max-w-[90rem]`. |
| ✅ | Customers — 8 desktop columns + row actions | #, Customer, Phone, Email, Orders, Measures, Added, ⋯ |
| ✅ | Orders — 8 desktop columns + row actions | Order, Customer, Style, Due, Status, Payment, Price, ⋯ |
| ✅ | Styles — 6 desktop columns + row actions | #, Style (thumbnail), Category, Measures, Added, ⋯ — photo grid kept on phones |
| ✅ | Quick measure — recent as a table, picker 3-up | One customer per full-width row was the worst offender |
| ❌ | Dashboard, Customer detail, Order detail, New order, Profile | Not yet laid out for a desk — **blocked, see below** |
| ❌ | Mobile pass across all of the above | Cards stay on phones; they have not been re-checked since the sweep |

## Tier 2 — visual language

| | Item | Notes |
|---|---|---|
| ✅ | Logo | Was a drawn mark; read as childish twice, so it is now a set wordmark and nothing else. |
| ✅ | Display face | Fraunces is a soft-serif with a "wonk" axis — playful by design. Now Bodoni Moda, confined to h1/h2 and figures. |
| ✅ | `--radius: 1rem → 0.375rem` | 77 pill controls squared, 88 oversized card corners squared. Avatars, badges, switches and sliders deliberately left round. |
| ✅ | Landing page | Hairline rules instead of six shadowed cards |
| ❌ | Dark mode | The token set exists but has never been looked at |
| ❌ | Empty, loading and error states | Still carry the old chrome on several pages |

## Tier 3 — polish

| | Item |
|---|---|
| ❌ | Keyboard and screen-reader pass over the new tables and menus |
| ❌ | Column sorting and a sensible column set on narrow laptops |
| ❌ | Print stylesheet for an order sheet |

---

## What is blocking Tier 1

Nine of the routes are behind `ProtectedRoute`. They cannot be loaded, measured
or screenshotted without a session, so everything above about them is read from
the code rather than seen. **A throwaway account on a test Supabase project
would unblock the rest of Tier 1** — not the production project, and not a real
customer's account.
