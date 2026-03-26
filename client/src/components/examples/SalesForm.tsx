import SalesForm from "../SalesForm";

const mockProducts = [
  { id: "1", name: "Citrato de Magnesio", price: 150, cost: 81.43 },
  { id: "2", name: "Berberina", price: 130, cost: 46.48 },
];

const mockDirectors = [
  { id: "d1", name: "Director Norte" },
  { id: "d2", name: "Director Sur" },
];

const mockSellers = [
  { id: "s1", name: "Vendedor A", directorId: "d1" },
  { id: "s2", name: "Vendedor B", directorId: "d2" },
];

export default function SalesFormExample() {
  return (
    <div className="p-6 bg-background">
      <SalesForm
        products={mockProducts}
        directors={mockDirectors}
        sellers={mockSellers}
        onSubmit={(data) => console.log("Sale submitted:", data)}
      />
    </div>
  );
}
