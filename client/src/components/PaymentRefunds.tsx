import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DollarSign, RefreshCw, Search, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Payment {
  id: string;
  client_id: string;
  order_id?: string;
  subscription_id?: string;
  amount_cents: number;
  currency: string;
  payment_method: string;
  status: string;
  created_at: string;
  completed_at?: string;
}

interface PaymentRefundsProps {
  className?: string;
}

export default function PaymentRefunds({ className }: PaymentRefundsProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [refundForm, setRefundForm] = useState({
    amount: "",
    refund_reason: "",
    refund_method: "original",
  });

  // Fetch payments
  const { data: payments = [], isLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/payments");
      return await res.json();
    },
  });

  // Create refund mutation
  const createRefundMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/payments/refund", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      toast({ title: "Refund processed successfully" });
      setIsRefundDialogOpen(false);
      setSelectedPayment(null);
      setRefundForm({ amount: "", refund_reason: "", refund_method: "original" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process refund",
        variant: "destructive",
      });
    },
  });

  const handleRefund = (payment: Payment) => {
    setSelectedPayment(payment);
    setRefundForm({
      amount: (payment.amount_cents / 100).toFixed(2),
      refund_reason: "",
      refund_method: "original",
    });
    setIsRefundDialogOpen(true);
  };

  const handleSubmitRefund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;

    createRefundMutation.mutate({
      payment_id: selectedPayment.id,
      amount: parseFloat(refundForm.amount),
      refund_reason: refundForm.refund_reason,
      refund_method: refundForm.refund_method,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "failed":
        return "bg-red-500";
      case "pending":
      case "processing":
        return "bg-yellow-500";
      case "refunded":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "refunded":
        return <RefreshCw className="w-4 h-4 text-gray-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const filteredPayments = payments.filter((payment) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      payment.id.toLowerCase().includes(query) ||
      payment.client_id.toLowerCase().includes(query) ||
      payment.payment_method.toLowerCase().includes(query) ||
      payment.status.toLowerCase().includes(query)
    );
  });

  const refundablePayments = filteredPayments.filter(
    (p) => p.status === "completed" && !p.status.includes("refunded")
  );

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          <h2 className="text-xl font-bold">Payment Refunds</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search payments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      {/* Refundable Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Refundable Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {refundablePayments.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No refundable payments found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {refundablePayments.map((payment) => (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">Payment #{payment.id.substring(0, 8).toUpperCase()}</h3>
                      <Badge className={getStatusColor(payment.status)}>
                        {payment.status}
                      </Badge>
                      {getStatusIcon(payment.status)}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Client ID: {payment.client_id.substring(0, 8)}...</p>
                      <p>Amount: ₹{(payment.amount_cents / 100).toLocaleString()}</p>
                      <p>Method: {payment.payment_method}</p>
                      <p>
                        Date: {new Date(payment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleRefund(payment)}
                    variant="outline"
                    className="ml-4"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Process Refund
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Payments */}
      <Card>
        <CardHeader>
          <CardTitle>All Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredPayments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No payments found</p>
              </div>
            ) : (
              filteredPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">#{payment.id.substring(0, 8).toUpperCase()}</h3>
                      <Badge className={getStatusColor(payment.status)}>
                        {payment.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ₹{(payment.amount_cents / 100).toLocaleString()} • {payment.payment_method}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Refund Dialog */}
      <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription>
              Process a refund for payment #{selectedPayment?.id.substring(0, 8).toUpperCase()}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitRefund} className="space-y-4">
            <div>
              <Label htmlFor="refund-amount">Refund Amount (₹)</Label>
              <Input
                id="refund-amount"
                type="number"
                step="0.01"
                value={refundForm.amount}
                onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })}
                required
                max={selectedPayment ? (selectedPayment.amount_cents / 100).toFixed(2) : undefined}
              />
              {selectedPayment && (
                <p className="text-xs text-muted-foreground mt-1">
                  Original amount: ₹{(selectedPayment.amount_cents / 100).toLocaleString()}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="refund-method">Refund Method</Label>
              <Select
                value={refundForm.refund_method}
                onValueChange={(value) => setRefundForm({ ...refundForm, refund_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">Original Payment Method</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="wallet_credit">Wallet Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="refund-reason">Reason for Refund</Label>
              <Textarea
                id="refund-reason"
                value={refundForm.refund_reason}
                onChange={(e) => setRefundForm({ ...refundForm, refund_reason: e.target.value })}
                placeholder="Enter reason for refund..."
                rows={3}
                required
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                disabled={createRefundMutation.isPending}
                className="flex-1"
              >
                {createRefundMutation.isPending ? "Processing..." : "Process Refund"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsRefundDialogOpen(false);
                  setSelectedPayment(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

