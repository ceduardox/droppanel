import { useState } from "react";
import ProductForm from "../ProductForm";
import { Button } from "@/components/ui/button";

export default function ProductFormExample() {
  const [open, setOpen] = useState(true);

  return (
    <div className="p-6 bg-background">
      <Button onClick={() => setOpen(true)}>Abrir Formulario</Button>
      <ProductForm
        open={open}
        onOpenChange={setOpen}
        onSubmit={(data) => {
          console.log("Product submitted:", data);
          setOpen(false);
        }}
      />
    </div>
  );
}
