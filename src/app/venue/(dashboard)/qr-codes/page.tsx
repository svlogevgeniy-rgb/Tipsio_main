"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Download, ExternalLink } from "lucide-react";

const tableQrSchema = z.object({
  label: z.string().min(1, "Label is required"),
});

type TableQrForm = z.infer<typeof tableQrSchema>;

type QrCode = {
  id: string;
  type: "PERSONAL" | "TABLE" | "VENUE";
  label: string | null;
  shortCode: string;
  status: string;
  staff?: {
    id: string;
    displayName: string;
    status: string;
  } | null;
  _count?: {
    tips: number;
  };
};

export default function QrCodesPage() {
  const [venueId, setVenueId] = useState<string | null>(null);
  const [qrCodes, setQrCodes] = useState<QrCode[]>([]);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<TableQrForm>({
    resolver: zodResolver(tableQrSchema),
    defaultValues: { label: "" },
  });

  const personalQrs = qrCodes.filter((qr) => qr.type === "PERSONAL");
  const tableQrs = qrCodes.filter(
    (qr) => qr.type === "TABLE" || qr.type === "VENUE"
  );

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  // Load venue and QR codes
  useEffect(() => {
    async function fetchData() {
      try {
        const dashRes = await fetch("/api/venues/dashboard?period=week");
        if (!dashRes.ok) throw new Error("Failed to load venue");
        const dashData = await dashRes.json();

        if (dashData.venue?.id) {
          setVenueId(dashData.venue.id);

          // Fetch QR codes
          const qrRes = await fetch(`/api/qr?venueId=${dashData.venue.id}`);
          if (qrRes.ok) {
            const qrData = await qrRes.json();
            setQrCodes(qrData.qrCodes || []);
          }
        }
      } catch (err) {
        console.error("Failed to load data:", err);
        setError("Failed to load QR codes");
      } finally {
        setIsPageLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleCreateTableQr = async (data: TableQrForm) => {
    if (!venueId) {
      setError("Venue not loaded");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, type: "TABLE", venueId }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Failed to create QR code");
        return;
      }

      setQrCodes([result.qrCode, ...qrCodes]);
      setIsDialogOpen(false);
      form.reset();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (
    qrId: string,
    format: "png" | "svg",
    label: string
  ) => {
    try {
      const response = await fetch(`/api/qr/${qrId}/download?format=${format}`);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-${label.replace(/\s+/g, "-").toLowerCase()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download failed:", err);
      setError("Failed to download QR code");
    }
  };

  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">QR Codes</h1>
        <p className="text-muted-foreground">
          Download QR codes for staff and tables
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      <Tabs defaultValue="staff" className="space-y-6">
        <TabsList className="glass">
          <TabsTrigger value="staff">Staff QRs ({personalQrs.length})</TabsTrigger>
          <TabsTrigger value="tables">Table QRs ({tableQrs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="staff">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="font-heading">
                Personal Staff QR Codes
              </CardTitle>
              <CardDescription>
                Personal codes are generated automatically when you add staff
                members.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {personalQrs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No staff QR codes yet. Add staff members first.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => (window.location.href = "/venue/staff")}
                  >
                    Go to Staff Management
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {personalQrs.map((qr) => (
                    <div
                      key={qr.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">
                          {qr.staff?.displayName || qr.label || "Unknown"}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {baseUrl}/tip/{qr.shortCode}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            window.open(`${baseUrl}/tip/${qr.shortCode}`, "_blank")
                          }
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDownload(
                              qr.id,
                              "png",
                              qr.staff?.displayName || qr.shortCode
                            )
                          }
                        >
                          <Download className="h-4 w-4 mr-1" />
                          PNG
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tables">
          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-heading">
                  Table / Venue QR Codes
                </CardTitle>
                <CardDescription>
                  Generic codes for pooled tips (tables or zones)
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-cyan-500 to-blue-600">
                    + Create Table QR
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-heavy">
                  <DialogHeader>
                    <DialogTitle className="font-heading">
                      Create Table QR
                    </DialogTitle>
                    <DialogDescription>
                      Create a QR code for a table or zone
                    </DialogDescription>
                  </DialogHeader>

                  <form
                    onSubmit={form.handleSubmit(handleCreateTableQr)}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="label">Table Name / Number</Label>
                      <Input
                        id="label"
                        placeholder="e.g. Table 1, VIP Area, Bar"
                        {...form.register("label")}
                        className="h-12"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-14 text-lg font-heading font-bold bg-gradient-to-r from-cyan-500 to-blue-600"
                    >
                      {isLoading ? "Creating..." : "Create QR Code"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {tableQrs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No table QR codes yet. Create one to start receiving pooled
                    tips.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tableQrs.map((qr) => (
                    <div
                      key={qr.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{qr.label}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {baseUrl}/tip/{qr.shortCode}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            window.open(`${baseUrl}/tip/${qr.shortCode}`, "_blank")
                          }
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDownload(qr.id, "png", qr.label || qr.shortCode)
                          }
                        >
                          <Download className="h-4 w-4 mr-1" />
                          PNG
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
