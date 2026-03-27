import type { TiendanubeProduct } from "@/lib/tiendanube/types";
import type { CategorySlug } from "./taxonomy";

export interface CategoryAssignment {
  categorySlug: CategorySlug;
  subcategorySlug?: string;
  tnCategoryRaw?: string;
}

// Normalize text for comparison: lowercase, remove accents, trim
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Map from Tiendanube category names to our taxonomy
const TN_CATEGORY_MAP: Record<
  string,
  { category: CategorySlug; subcategory?: string }
> = {
  ropa: { category: "moda" },
  indumentaria: { category: "moda" },
  vestimenta: { category: "moda" },
  remeras: { category: "moda", subcategory: "moda_remeras" },
  pantalones: { category: "moda", subcategory: "moda_pantalones" },
  vestidos: { category: "moda" },
  calzado: { category: "calzado" },
  zapatos: { category: "calzado" },
  zapatillas: { category: "calzado" },
  botas: { category: "calzado" },
  accesorios: { category: "accesorios" },
  bijouterie: { category: "accesorios" },
  bolsos: { category: "accesorios" },
  carteras: { category: "accesorios" },
  hogar: { category: "hogar_deco" },
  decoracion: { category: "hogar_deco" },
  iluminacion: { category: "hogar_deco", subcategory: "hogar_iluminacion" },
  muebles: { category: "hogar_deco" },
  textiles: { category: "hogar_deco", subcategory: "hogar_textil" },
  ferreteria: { category: "ferreteria" },
  herramientas: { category: "ferreteria" },
  construccion: { category: "ferreteria" },
  tecnologia: { category: "tecnologia" },
  electronica: { category: "tecnologia" },
  celulares: { category: "tecnologia" },
  computacion: { category: "tecnologia" },
  belleza: { category: "belleza" },
  cosmetica: { category: "belleza" },
  perfumeria: { category: "belleza" },
  deportes: { category: "deportes" },
  fitness: { category: "deportes" },
  mascotas: { category: "mascotas" },
  animales: { category: "mascotas" },
  juguetes: { category: "juguetes" },
  juegos: { category: "juguetes" },
  bebes: { category: "bebes" },
  maternidad: { category: "bebes" },
  ninos: { category: "bebes" },
};

// Keywords to search in title/description - order matters (more specific first)
const KEYWORD_MAP: Array<{
  keywords: string[];
  category: CategorySlug;
  subcategory?: string;
}> = [
  // Most specific first
  {
    keywords: ["short deportivo", "ropa deportiva", "calza deportiva"],
    category: "deportes",
  },
  {
    keywords: ["lampara", "velador", "luz ", "led "],
    category: "hogar_deco",
    subcategory: "hogar_iluminacion",
  },
  {
    keywords: ["sabana", "funda", "almohadon", "toalla", "mantel"],
    category: "hogar_deco",
    subcategory: "hogar_textil",
  },
  {
    keywords: ["zapatilla", "zapato", "bota", "sandalia", "mocasin"],
    category: "calzado",
  },
  {
    keywords: [
      "remera",
      "camiseta",
      "buzo",
      "campera",
      "vestido",
      "blusa",
      "chomba",
    ],
    category: "moda",
    subcategory: "moda_remeras",
  },
  {
    keywords: ["pantalon", "jean", "short", "bermuda", "calza"],
    category: "moda",
    subcategory: "moda_pantalones",
  },
  {
    keywords: [
      "cartera",
      "bolso",
      "mochila",
      "billetera",
      "cinturon",
      "collar",
      "pulsera",
      "anillo",
    ],
    category: "accesorios",
  },
  {
    keywords: [
      "silla",
      "mesa",
      "sofa",
      "mueble",
      "estante",
      "cuadro",
      "espejo",
      "vela",
    ],
    category: "hogar_deco",
  },
  {
    keywords: [
      "taladro",
      "martillo",
      "tornillo",
      "tuerca",
      "pintura",
      "cemento",
      "cano",
      "herramienta",
    ],
    category: "ferreteria",
  },
  {
    keywords: [
      "celular",
      "tablet",
      "notebook",
      "auricular",
      "teclado",
      "mouse",
      "cargador",
      "smartwatch",
    ],
    category: "tecnologia",
  },
  {
    keywords: [
      "crema",
      "shampoo",
      "perfume",
      "maquillaje",
      "labial",
      "serum",
      "mascarilla",
    ],
    category: "belleza",
  },
  {
    keywords: [
      "pelota",
      "bicicleta",
      "pesas",
      "yoga",
      "running",
      "natacion",
      "gym",
    ],
    category: "deportes",
  },
  { keywords: ["perro", "gato", "mascota", "correa"], category: "mascotas" },
  { keywords: ["juguete", "muneca", "lego", "puzzle"], category: "juguetes" },
  {
    keywords: ["bebe", "panal", "mamadera", "cochecito", "cuna"],
    category: "bebes",
  },
];

export function assignCategory(
  tnProduct: TiendanubeProduct
): CategoryAssignment {
  // Collect raw TN categories for auditing
  const tnCategoryRaw = extractTnCategoryRaw(tnProduct);

  // Step 1: Try to match from Tiendanube categories
  if (tnProduct.categories && tnProduct.categories.length > 0) {
    for (const cat of tnProduct.categories) {
      const catName = extractLocalizedName(cat.name);
      if (!catName) continue;

      const normalized = normalize(catName);
      const match = TN_CATEGORY_MAP[normalized];
      if (match) {
        return {
          categorySlug: match.category,
          subcategorySlug: match.subcategory,
          tnCategoryRaw,
        };
      }

      // Also try partial match - if normalized contains any key
      for (const [key, value] of Object.entries(TN_CATEGORY_MAP)) {
        if (normalized.includes(key)) {
          return {
            categorySlug: value.category,
            subcategorySlug: value.subcategory,
            tnCategoryRaw,
          };
        }
      }
    }
  }

  // Step 2: Try to match from title + description keywords
  const title = extractLocalizedName(tnProduct.name) || "";
  const description = extractLocalizedName(tnProduct.description) || "";
  const searchText = normalize(title + " " + description);

  for (const rule of KEYWORD_MAP) {
    for (const keyword of rule.keywords) {
      if (searchText.includes(normalize(keyword))) {
        return {
          categorySlug: rule.category,
          subcategorySlug: rule.subcategory,
          tnCategoryRaw,
        };
      }
    }
  }

  // Step 3: Fallback
  return {
    categorySlug: "otros",
    tnCategoryRaw,
  };
}

function extractLocalizedName(
  obj: Record<string, string> | null | undefined
): string | null {
  if (!obj) return null;
  return obj.es || obj.en || obj.pt || Object.values(obj)[0] || null;
}

function extractTnCategoryRaw(tnProduct: TiendanubeProduct): string | undefined {
  if (!tnProduct.categories || tnProduct.categories.length === 0) {
    return undefined;
  }

  const names = tnProduct.categories
    .map((cat) => extractLocalizedName(cat.name))
    .filter(Boolean);

  return names.length > 0 ? names.join(" > ") : undefined;
}
