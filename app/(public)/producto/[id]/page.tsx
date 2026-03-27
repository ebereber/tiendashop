import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import { getPublicProductById } from "@/lib/services/products";
import { isAllowedImageHost } from "@/lib/images/allowed-hosts";
import { ProductInfo } from "@/components/product/product-info";

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
          <ProductInfo
            productId={product.id}
            title={product.title}
            brand={product.brand}
            priceMin={product.priceMin}
            storeName={product.storeName}
            storeSlug={product.storeSlug}
            variants={product.variants}
            cleanDescription={cleanDescription}
          />
        </div>
      </div>
    </div>
  );
}
