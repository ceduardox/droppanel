import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Copy, Check } from "lucide-react";

interface WhatsAppReportProps {
  reportText: string;
}

export default function WhatsAppReport({ reportText }: WhatsAppReportProps) {
  const [countryCode, setCountryCode] = useState("+591");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    const fullNumber = `${countryCode}${phoneNumber}`;
    const encodedText = encodeURIComponent(reportText);
    const whatsappUrl = `https://wa.me/${fullNumber}?text=${encodedText}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-chart-2" />
          Enviar Reporte por WhatsApp
        </CardTitle>
        <CardDescription>Configura el numero para enviar el reporte detallado</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="country-code">Codigo</Label>
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger id="country-code" data-testid="select-country-code">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="+591">BO +591</SelectItem>
                  <SelectItem value="+54">AR +54</SelectItem>
                  <SelectItem value="+56">CL +56</SelectItem>
                  <SelectItem value="+51">PE +51</SelectItem>
                  <SelectItem value="+55">BR +55</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="phone">Numero de Telefono</Label>
              <Input
                id="phone"
                data-testid="input-phone"
                type="tel"
                placeholder="70000000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Vista Previa del Reporte</Label>
              <Button size="sm" variant="outline" onClick={handleCopy} data-testid="button-copy-report">
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar
                  </>
                )}
              </Button>
            </div>

            <Textarea value={reportText} readOnly className="min-h-[200px] font-mono text-sm" data-testid="textarea-report-preview" />
          </div>
        </div>

        <Button
          className="w-full bg-[#25D366] text-white hover:bg-[#1fb855]"
          onClick={handleSendWhatsApp}
          disabled={!phoneNumber}
          data-testid="button-send-whatsapp"
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          Enviar por WhatsApp
        </Button>
      </CardContent>
    </Card>
  );
}
