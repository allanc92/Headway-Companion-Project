import { NextResponse, type NextRequest } from "next/server";

const GEO_VALUE_MAX_LENGTH = 128;

interface VisitorGeography {
  city: string | null;
  region: string | null;
  country: string | null;
}

function readGeoHeader(headers: Headers, name: string): string | null {
  const value = headers.get(name)?.trim();
  return value ? value.slice(0, GEO_VALUE_MAX_LENGTH) : null;
}

function readCity(headers: Headers): string | null {
  const encoded = headers.get("x-vercel-ip-city")?.trim();
  if (!encoded) return null;

  try {
    return decodeURIComponent(encoded).slice(0, GEO_VALUE_MAX_LENGTH);
  } catch (error) {
    console.warn(
      `[visitor-geography] ${JSON.stringify({
        event: "invalid-city-header",
        errorType: error instanceof Error ? error.name : typeof error,
      })}`,
    );
    return null;
  }
}

function getVisitorGeography(headers: Headers): VisitorGeography | null {
  const geography = {
    city: readCity(headers),
    region: readGeoHeader(headers, "x-vercel-ip-country-region"),
    country: readGeoHeader(headers, "x-vercel-ip-country"),
  };

  return geography.city || geography.region || geography.country
    ? geography
    : null;
}

function isDocumentRequest(request: NextRequest): boolean {
  if (request.method !== "GET") return false;

  const destination = request.headers.get("sec-fetch-dest");
  if (destination !== null) return destination === "document";

  return request.headers.get("accept")?.includes("text/html") ?? false;
}

export function proxy(request: NextRequest): NextResponse {
  if (isDocumentRequest(request)) {
    const geography = getVisitorGeography(request.headers);
    if (geography) {
      // Search params include ZIP and insurance in this demo, so log only the path.
      console.info(
        `[visitor-geography] ${JSON.stringify({
          event: "page-view",
          path: request.nextUrl.pathname,
          ...geography,
        })}`,
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png$|.*\\.svg$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
