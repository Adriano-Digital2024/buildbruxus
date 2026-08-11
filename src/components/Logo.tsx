// Logo do BuildBruxus. Usa variant para fundo escuro/claro.
// Por padrão, detecta o tema do body (dark). Pode forçar via prop `variant`.

const DARK_URL = "https://bruxus.me/_astro/logo-dark.Bj7A4erE.png";
const LIGHT_URL = "https://bruxus.me/_astro/logo-light.7Tf-2ky4.png";

export function Logo({
  variant,
  className = "",
  alt = "BuildBruxus",
}: {
  variant?: "dark" | "light";
  className?: string;
  alt?: string;
}) {
  // Se não especificar, assume fundo escuro (nosso app é dark-first)
  const src = variant === "light" ? LIGHT_URL : DARK_URL;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="eager"
      decoding="async"
      // fallback para o emoji 🧙 caso a logo falhe
      onError={(e) => {
        const img = e.currentTarget;
        img.style.display = "none";
        const fallback = img.nextElementSibling as HTMLElement | null;
        if (fallback) fallback.style.display = "inline-block";
      }}
    />
  );
}

export { DARK_URL as LOGO_DARK_URL, LIGHT_URL as LOGO_LIGHT_URL };