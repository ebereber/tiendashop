import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import { getPublicProductById } from "@/lib/services/products";
import { isAllowedImageHost } from "@/lib/images/allowed-hosts";
import { Button } from "@/components/ui/button";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getPublicProductById(id);

  if (!product) {
    return {
      title: "Producto no encontrado - TiendaShop",
    };
  }

  const description = product.description
    ? product.description.slice(0, 160).replace(/<[^>]*>/g, "")
    : `Compra ${product.title} en ${product.storeName}`;

  return {
    title: `${product.title} - TiendaShop`,
    description,
  };
}

export default async function ProductoPage({ params }: Props) {
  const { id } = await params;
  const product = await getPublicProductById(id);

  if (!product) {
    notFound();
  }

  const formattedPrice =
    product.priceMin != null && product.priceMin > 0
      ? `$${product.priceMin.toLocaleString("es-AR")}`
      : null;

  const buyUrl = `/api/r/${product.id}?from=product&pos=0`;
  const cleanDescription = product.description
    ? DOMPurify.sanitize(product.description, {
        ALLOWED_TAGS: ["p", "br", "b", "strong", "i", "em", "ul", "ol", "li"],
        ALLOWED_ATTR: [],
      })
    : null;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Image gallery */}
          <div className="space-y-4">
            {/* Main image */}
            <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
              {isAllowedImageHost(product.images[0]?.url) ? (
                <Image
                  src={product.images[0].url}
                  alt={product.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.images[0]?.url}
                  alt={product.title}
                  className="h-full w-full object-cover"
                />
              )}
            </div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {product.images.slice(0, 5).map((img, index) => (
                  <div
                    key={index}
                    className="relative aspect-square overflow-hidden rounded-md bg-muted"
                  >
                    {isAllowedImageHost(img.url) ? (
                      <Image
                        src={img.url}
                        alt={`${product.title} - imagen ${index + 1}`}
                        fill
                        sizes="10vw"
                        className="object-cover"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img.url}
                        alt={`${product.title} - imagen ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="space-y-6">
            <div>
              {product.brand && (
                <p className="text-sm text-muted-foreground">{product.brand}</p>
              )}
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
                {product.title}
              </h1>
            </div>

            {formattedPrice && (
              <p className="text-3xl font-bold">{formattedPrice}</p>
            )}

            <p className="text-sm text-muted-foreground">En stock</p>

            <Button
              size="lg"
              className="w-full sm:w-auto"
              nativeButton={false}
              render={<a href={buyUrl} />}
            >
              Comprar en {product.storeName}
            </Button>

            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Vendido por{" "}
                <Link
                  href={`/tienda/${product.storeSlug}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {product.storeName}
                </Link>
              </p>
            </div>

            {cleanDescription && (
              <div className="border-t pt-4">
                <h2 className="mb-2 font-semibold">Descripcion</h2>
                <div
                  className="prose prose-sm max-w-none text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: cleanDescription }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
