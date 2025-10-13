import ReportCard from "../ReportCard";

const mockSale = {
  id: "1",
  productName: "Berberina",
  quantity: 9,
  price: 130,
  cost: 46.48,
  date: "2024-10-13",
};

export default function ReportCardExample() {
  return (
    <div className="p-6 bg-background max-w-md">
      <ReportCard sale={mockSale} />
    </div>
  );
}
