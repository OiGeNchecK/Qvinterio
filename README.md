# Qvinterio

Вебзастосунок будівельної фірми Qvinterio: публічний сайт з роботами фірми, кабінет замовника з прогресом будови, панель працівника для замовлень і фото, адмін-панель для ролей, контактів постачальників і замовлень.

## Технології

- [Next.js 16](https://nextjs.org) (App Router, TypeScript), Tailwind CSS 4, статичний експорт
- Хостинг: GitHub Pages (`.github/workflows/pages.yml`), автодеплой після кожного пушу
- [Supabase](https://supabase.com): PostgreSQL, вхід користувачів, сховище фото
- Мови інтерфейсу: німецька (основна) і українська (тимчасово, див. `src/i18n`)

## Структура

| Шлях | Що там |
|---|---|
| `src/app/[locale]/page.tsx` | Головна сторінка (`/de/`, `/uk/`) |
| `src/app/[locale]/projekte` | Сторінки проєктів |
| `src/app/[locale]/login` | Вхід |
| `src/app/[locale]/admin` | Адмін-панель (адмін і бауляйтер) |
| `src/app/[locale]/worker` | Панель працівника |
| `src/app/[locale]/client` | Кабінет замовника: етапи і фото його будови |
| `src/content` | Тексти фірми і проєкти з qvinterio.de |
| `src/lib/auth.tsx` | Поточний користувач і перевірка ролей (у браузері) |
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
5. Відкрийте http://localhost:3000/de/.

Без Supabase головна сторінка теж відкривається, але вхід не працює.

### Перший адміністратор

Створіть користувача в Supabase (Authentication → Users), потім у SQL Editor:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'ваш@email';
```

## GitHub Pages

Сайт збирається як статичні файли, тому вся робота з даними йде з браузера напряму в Supabase.
Захист даних забезпечують правила RLS у базі, а не сервер.

Налаштування один раз:
1. Settings → Pages → Source: **GitHub Actions**.
2. Settings → Secrets and variables → Actions → Variables: `NEXT_PUBLIC_SUPABASE_URL` і `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (це публічні значення).

Адреса сайту: https://oigencheck.github.io/Qvinterio/

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
