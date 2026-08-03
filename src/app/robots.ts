import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/my-profile", "/api"],
      },
    ],
    sitemap: "https://ronel-lovely.com/sitemap.xml",
  };
}
