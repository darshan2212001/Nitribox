import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OTPInputProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (otp: string) => void;
}

export default function OTPInput({ open, onClose, onSubmit }: OTPInputProps) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!otp || otp.trim().length === 0) {
      setError("Please enter the OTP");
      return;
    }
    if (otp.length !== 4) {
      setError("OTP must be exactly 4 digits");
      return;
    }
    if (!/^\d{4}$/.test(otp)) {
      setError("OTP must contain only numbers");
      return;
    }
    setError(null);
    onSubmit(otp);
    setOtp("");
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setOtp(value);
    if (error) {
      setError(null);
    }
  };

  const handleClose = () => {
    setOtp("");
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter OTP</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="otp">4-Digit OTP</Label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={otp}
              onChange={handleChange}
              placeholder="0000"
              className={`text-center text-2xl tracking-widest mt-2 ${error ? "border-destructive" : ""}`}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubmit();
                }
              }}
            />
            {error ? (
              <p className="text-xs text-destructive mt-2">{error}</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">
                Enter the 4-digit OTP provided by the customer
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={otp.length !== 4 || !/^\d{4}$/.test(otp)}
              className="flex-1"
            >
              Verify
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


