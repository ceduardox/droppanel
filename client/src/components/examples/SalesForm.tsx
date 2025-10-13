import SalesForm from "../SalesForm";

const mockProducts = [
  { id: "1", name: "Citrato de Magnesio", price: 150, cost: 81.43 },
  { id: "2", name: "Berberina", price: 130, cost: 46.48 },
];

export default function SalesFormExample() {
  return (
    <div className="p-6 bg-background">
      <SalesForm
        products={mockProducts}
        onSubmit={(data) => console.log("Sale submitted:", data)}
      />
    </div>
  );
}
