# Qvinterio

Вебзастосунок будівельної фірми Qvinterio: публічний сайт з роботами фірми, кабінет замовника з прогресом будови, панель працівника для замовлень і фото, адмін-панель для ролей, контактів постачальників і замовлень.

## Технології

- [Next.js 16](https://nextjs.org) (App Router, TypeScript), Tailwind CSS 4
- [Supabase](https://supabase.com): PostgreSQL, вхід користувачів, сховище фото
- Мови інтерфейсу: німецька (основна) і українська (тимчасово, див. `src/i18n`)

## Структура

| Шлях | Що там |
|---|---|
| `src/app/page.tsx` | Головна сторінка (портфоліо, послуги, контакти) |
| `src/app/login` | Вхід |
| `src/app/admin` | Адмін-панель (адмін і бауляйтер) |
| `src/app/worker` | Панель працівника |
| `src/app/client` | Кабінет замовника: етапи і фото його будови |
| `src/lib/auth.ts` | Поточний користувач і перевірка ролей |
| `src/i18n` | Переклади DE / UK |
| `supabase/migrations` | Схема бази, права доступу (RLS), бакети для фото |

## Запуск локально

1. Створіть проєкт на [supabase.com](https://supabase.com).
2. Виконайте SQL з `supabase/migrations/*.sql` (SQL Editor або `supabase db push`).
3. Скопіюйте `.env.example` у `.env.local` і впишіть URL та publishable key з Settings → API.
4. ```bash
   npm install
   npm run dev
   ```
5. Відкрийте http://localhost:3000.

Без Supabase головна сторінка теж відкривається, але вхід не працює.

### Перший адміністратор

Створіть користувача в Supabase (Authentication → Users), потім у SQL Editor:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'ваш@email';
```

## Ролі

- **admin**: усе, включно з користувачами і ролями
- **manager** (бауляйтер): об'єкти, замовлення, контакти, доступи клієнтів
- **worker**: свої об'єкти, створення замовлень, фото
- **client**: лише перегляд своєї будови, поки діє доступ (`client_access.expires_at`)

## Перевірки

```bash
npm run lint
npm run build
```
