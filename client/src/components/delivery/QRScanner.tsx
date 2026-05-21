import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, X } from "lucide-react";

interface QRScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
  onUseOTP?: () => void;
}

export default function QRScanner({ open, onClose, onScan, onUseOTP }: QRScannerProps) {
  const [scanning, setScanning] = useState(false);

  // Mock QR scanner - in production, this would use a real QR scanner library
  const handleMockScan = () => {
    setScanning(true);
    // Simulate QR scan
    setTimeout(() => {
      const mockQRData = `ORDER-${Date.now()}`;
      onScan(mockQRData);
      setScanning(false);
      onClose();
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Scan QR Code
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
            {scanning ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Scanning...</p>
              </div>
            ) : (
              <div className="text-center p-8">
                <QrCode className="w-24 h-24 mx-auto text-gray-400 mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Position QR code within the frame
                </p>
                <Button onClick={handleMockScan} size="lg">
                  Simulate Scan (Mock)
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            {onUseOTP && (
              <Button variant="outline" onClick={onUseOTP} className="flex-1">
                Use OTP Instead
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


