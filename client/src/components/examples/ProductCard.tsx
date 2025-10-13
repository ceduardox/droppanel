import ProductCard from "../ProductCard";

export default function ProductCardExample() {
  return (
    <div className="p-6 bg-background">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl">
        <ProductCard
          id="1"
          name="Citrato de Magnesio"
          price={150}
          cost={81.43}
          onEdit={(id) => console.log("Edit product:", id)}
          onDelete={(id) => console.log("Delete product:", id)}
        />
        <ProductCard
          id="2"
          name="Berberina"
          price={130}
          cost={46.48}
          onEdit={(id) => console.log("Edit product:", id)}
          onDelete={(id) => console.log("Delete product:", id)}
        />
      </div>
    </div>
  );
}
