import SalesForm from "@/components/SalesForm";

// TODO: Remove mock data - replace with real data from backend
const mockProducts = [
  { id: "1", name: "Citrato de Magnesio", price: 150, cost: 81.43 },
  { id: "2", name: "Berberina", price: 130, cost: 46.48 },
];

export default function Sales() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Registrar Venta</h1>
        <p className="text-muted-foreground mt-1">Ingresa los detalles de la nueva venta</p>
      </div>

      <SalesForm
        products={mockProducts}
        onSubmit={(data) => console.log("Sale submitted:", data)}
      />
    </div>
  );
}
