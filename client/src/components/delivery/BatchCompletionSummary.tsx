import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

interface BatchCompletionSummaryProps {
  batchName: string;
  summary: {
    total_orders: number;
    delivered: number;
    failed: number;
    time_taken?: string;
  };
  onComplete: () => void;
}

export default function BatchCompletionSummary({
  batchName,
  summary,
  onComplete,
}: BatchCompletionSummaryProps) {
  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          {batchName} – Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{summary.total_orders}</p>
            <p className="text-sm text-muted-foreground">Orders</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{summary.delivered}</p>
            <p className="text-sm text-muted-foreground">Delivered</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{summary.failed}</p>
            <p className="text-sm text-muted-foreground">Failed</p>
          </div>
        </div>

        {summary.time_taken && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Time taken: {summary.time_taken}</span>
          </div>
        )}

        {summary.failed > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Failed Orders:</p>
            <div className="space-y-1">
              <Badge variant="outline" className="bg-red-50 text-red-700">
                <XCircle className="w-3 h-3 mr-1" />
                {summary.failed} order(s) could not be delivered
              </Badge>
            </div>
          </div>
        )}

        <Button onClick={onComplete} size="lg" className="w-full mt-4">
          Complete Batch
        </Button>
      </CardContent>
    </Card>
  );
}


