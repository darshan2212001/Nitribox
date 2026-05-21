import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useRealtime } from "@/hooks/use-realtime";
import { Search, User, Calendar, CreditCard, Filter, X } from "lucide-react";
import UserDetailsDrawer from "./UserDetailsDrawer";
import EmptyState from "@/components/EmptyState";

export default function NutritionistAllocation() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>("all");

  // Fetch pending allocations
  const { data: pendingAllocations, isLoading } = useQuery({
    queryKey: ["/api/admin/nutritionist-allocation/pending"],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Subscribe to real-time updates for new pending allocations
  useRealtime({
    channel: "admin",
    onMessage: (event) => {
      if (event.type === "subscription.updated" && event.data?.allocation_status === "pending_allocation") {
        // Invalidate query to refetch pending allocations
        queryClient.invalidateQueries({ queryKey: ["/api/admin/nutritionist-allocation/pending"] });
        toast({
          title: "New allocation request",
          description: `New user ${event.data.client_id ? "needs" : "needs"} nutritionist allocation`,
        });
      }
    },
  });

  const filteredAllocations = pendingAllocations?.filter((item: any) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        item.user_name?.toLowerCase().includes(query) ||
        item.meal_plan_title?.toLowerCase().includes(query) ||
        item.plan_category?.toLowerCase().includes(query) ||
        item.primary_goal?.toLowerCase().includes(query) ||
        item.key_conditions?.some((c: string) => c.toLowerCase().includes(query))
      );
      if (!matchesSearch) return false;
    }
    
    // Category filter
    if (filterCategory !== "all" && item.plan_category?.toLowerCase() !== filterCategory.toLowerCase()) {
      return false;
    }
    
    // Payment status filter
    if (filterPaymentStatus !== "all" && item.payment_status !== filterPaymentStatus) {
      return false;
    }
    
    return true;
  }) || [];

  // Get unique categories for filter
  const uniqueCategories = Array.from(
    new Set(pendingAllocations?.map((item: any) => item.plan_category).filter(Boolean) || [])
  );

  const handleRowClick = (userId: string) => {
    setSelectedUserId(userId);
    setIsDrawerOpen(true);
  };

  const handleAllocationComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/nutritionist-allocation/pending"] });
    setIsDrawerOpen(false);
    setSelectedUserId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Nutritionist Allocation</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Assign nutritionists to users who have completed checkout
            </p>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Plan Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {uniqueCategories.map((category: string) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPaymentStatus} onValueChange={setFilterPaymentStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Payment Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          {(filterCategory !== "all" || filterPaymentStatus !== "all" || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterCategory("all");
                setFilterPaymentStatus("all");
                setSearchQuery("");
              }}
            >
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {filteredAllocations.length === 0 ? (
        <EmptyState
          icon={User}
          title="No pending allocations"
          description={
            searchQuery
              ? "No users match your search criteria"
              : "All users have been allocated to nutritionists"
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pending Allocations ({filteredAllocations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Name</TableHead>
                    <TableHead>Plan Type</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Primary Goal</TableHead>
                    <TableHead>Key Conditions</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Consultation</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAllocations.map((item: any) => (
                    <TableRow
                      key={item.user_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(item.user_id)}
                    >
                      <TableCell className="font-medium">{item.user_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.meal_plan_title}</Badge>
                      </TableCell>
                      <TableCell>{item.duration_days} days</TableCell>
                      <TableCell>{item.primary_goal || "N/A"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.key_conditions?.slice(0, 2).map((condition: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {condition}
                            </Badge>
                          ))}
                          {item.key_conditions?.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{item.key_conditions.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.payment_status === "completed" ? "default" : "outline"}
                        >
                          {item.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.consultation_preference ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            <span>Scheduled</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not scheduled</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.allocation_status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(item.user_id);
                          }}
                        >
                          Allocate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedUserId && (
        <UserDetailsDrawer
          userId={selectedUserId}
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedUserId(null);
          }}
          onAllocationComplete={handleAllocationComplete}
        />
      )}
    </div>
  );
}

