import { RedirectToLocale } from "./redirect-to-locale";

// Static hosting has no server redirects: send visitors to the German site.
export default function Root() {
  return <RedirectToLocale />;
}
