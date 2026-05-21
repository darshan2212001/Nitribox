import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle } from "lucide-react";

interface IssueReportModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    reason: string;
    note: string;
    photo_url?: string;
    attempt_again: boolean;
  }) => void;
}

const ISSUE_REASONS = [
  { value: "CUSTOMER_UNREACHABLE", label: "Customer Unreachable" },
  { value: "WRONG_ADDRESS", label: "Wrong Address" },
  { value: "CUSTOMER_CANCELLED", label: "Customer Cancelled at Door" },
  { value: "FOOD_DAMAGED", label: "Food Damaged" },
  { value: "SECURITY_ISSUE", label: "Security/Building Access Issue" },
  { value: "OTHER", label: "Other" },
];

export default function IssueReportModal({
  open,
  onClose,
  onSubmit,
}: IssueReportModalProps) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [attemptAgain, setAttemptAgain] = useState(false);

  const handleSubmit = () => {
    if (!reason) {
      return;
    }
    onSubmit({
      reason,
      note,
      attempt_again: attemptAgain,
    });
    // Reset form
    setReason("");
    setNote("");
    setAttemptAgain(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Report Delivery Issue
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="reason">Issue Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason" className="mt-2">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {ISSUE_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="note">Additional Notes</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Describe the issue..."
              className="mt-2"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="attempt-again"
              checked={attemptAgain}
              onChange={(e) => setAttemptAgain(e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor="attempt-again" className="text-sm font-normal">
              Attempt again later
            </Label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!reason} className="flex-1">
              Submit Report
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


