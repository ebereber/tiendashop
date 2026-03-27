export const CATEGORIES = {
  moda: "Moda",
  calzado: "Calzado",
  accesorios: "Accesorios",
  hogar_deco: "Hogar & Deco",
  ferreteria: "Ferreteria & Herramientas",
  tecnologia: "Tecnologia",
  belleza: "Belleza",
  deportes: "Deportes",
  mascotas: "Mascotas",
  juguetes: "Juguetes",
  bebes: "Bebes",
  otros: "Otros",
} as const;

export type CategorySlug = keyof typeof CATEGORIES;

export const SUBCATEGORIES: Record<
  string,
  { parent: CategorySlug; label: string }
> = {
  moda_remeras: { parent: "moda", label: "Remeras" },
  moda_pantalones: { parent: "moda", label: "Pantalones" },
  hogar_iluminacion: { parent: "hogar_deco", label: "Iluminacion" },
  hogar_textil: { parent: "hogar_deco", label: "Textil" },
  ferreteria_manuales: { parent: "ferreteria", label: "Herramientas manuales" },
  tecnologia_accesorios: { parent: "tecnologia", label: "Accesorios" },
};

export type SubcategorySlug = keyof typeof SUBCATEGORIES;
