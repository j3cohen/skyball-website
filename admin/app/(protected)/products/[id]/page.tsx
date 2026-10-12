// /products/[id] — edit one shop product (images, copy, flags).

import ProductEditor from "@/components/product-editor";

export default function ProductPage({ params }: { params: { id: string } }) {
  return <ProductEditor productId={params.id} />;
}
