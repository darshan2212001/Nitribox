import { Users, Utensils, TrendingUp, DollarSign, Database } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { pageTransitionVariants, viewportConfig } from "@/lib/animations";
import StatsCard from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function AdminPortal() {
  const { toast } = useToast();
  const [mealDialogOpen, setMealDialogOpen] = useState(false);
  const [nutritionistDialogOpen, setNutritionistDialogOpen] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);

  // Form states
  const [mealForm, setMealForm] = useState({
    title: "",
    description: "",
    category: "",
    currentPrice: "",
    features: "",
  });

  const [nutritionistForm, setNutritionistForm] = useState({
    name: "",
    email: "",
    specialization: "",
    experience: "",
  });

  const [clientForm, setClientForm] = useState({
    userId: "",
    nutritionistId: "",
    weightStart: "",
    weightGoal: "",
    height: "",
    age: "",
    gender: "",
    dietaryPreferences: "",
  });

  // Fetch meal plans from API
  const { data: mealPlansData, isLoading: mealPlansLoading } = useQuery({
    queryKey: ["/api/meal-plans"],
  });

  // Fetch nutritionists from API
  const { data: nutritionistsData } = useQuery({
    queryKey: ["/api/nutritionists"],
  });

  // Fetch clients from API (for total users)
  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
  });

  // Fetch orders from API (for recent orders)
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders"],
  });

  // Calculate stats
  const totalUsers = Array.isArray(clientsData) ? clientsData.length : 0;
  const activeMealPlans = Array.isArray(mealPlansData) 
    ? mealPlansData.filter((plan: any) => plan.isActive).length 
    : 0;
  
  // Get recent orders (clone array to avoid mutating cache)
  const recentOrders = Array.isArray(ordersData) 
    ? [...ordersData]
        .sort((a: any, b: any) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime())
        .slice(0, 5)
    : [];

  // Seed database mutation
  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/seed-database");
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Database Seeded",
        description: "Sample data has been added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nutritionists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error: any) => {
      toast({
        title: "Seeding Failed",
        description: error.message || "Failed to seed database",
        variant: "destructive",
      });
    },
  });

  // Create meal plan mutation
  const createMealMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/meal-plans", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Meal Plan Created",
        description: "New meal plan has been added successfully",
      });
      setMealDialogOpen(false);
      setMealForm({
        title: "",
        description: "",
        category: "",
        currentPrice: "",
        features: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans"] });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create meal plan",
        variant: "destructive",
      });
    },
  });

  // Create nutritionist mutation
  const createNutritionistMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/nutritionists", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Nutritionist Added",
        description: "New nutritionist has been added successfully",
      });
      setNutritionistDialogOpen(false);
      setNutritionistForm({
        name: "",
        email: "",
        specialization: "",
        experience: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/nutritionists"] });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to add nutritionist",
        variant: "destructive",
      });
    },
  });

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/clients", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Client Added",
        description: "New client has been added successfully",
      });
      setClientDialogOpen(false);
      setClientForm({
        userId: "",
        nutritionistId: "",
        weightStart: "",
        weightGoal: "",
        height: "",
        age: "",
        gender: "",
        dietaryPreferences: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to add client",
        variant: "destructive",
      });
    },
  });

  // Handle meal form submit
  const handleMealSubmit = () => {
    createMealMutation.mutate({
      ...mealForm,
      currentPrice: parseFloat(mealForm.currentPrice),
      originalPrice: parseFloat(mealForm.currentPrice),
      isActive: true,
      rating: 0,
      reviewCount: 0,
    });
  };

  // Handle nutritionist form submit
  const handleNutritionistSubmit = () => {
    createNutritionistMutation.mutate({
      name: nutritionistForm.name,
      email: nutritionistForm.email,
      specialization: nutritionistForm.specialization,
      experienceYears: parseInt(nutritionistForm.experience),
      rating: 0,
      reviewCount: 0,
    });
  };

  // Handle client form submit
  const handleClientSubmit = () => {
    createClientMutation.mutate({
      ...clientForm,
      weightStart: parseFloat(clientForm.weightStart),
      weightCurrent: parseFloat(clientForm.weightStart),
      weightGoal: parseFloat(clientForm.weightGoal),
      height: parseFloat(clientForm.height),
      age: parseInt(clientForm.age),
    });
  };
  return (
    <motion.div
      {...pageTransitionVariants}
      className="min-h-screen bg-background"
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="bg-[#6B46C1] text-white py-8 mb-8"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
          <p className="text-white/90">Manage your entire ecosystem</p>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          <StatsCard
            title="Total Users"
            value={clientsLoading ? "..." : String(totalUsers)}
            subtitle="Active clients"
            icon={Users}
          />
          <StatsCard
            title="Meal Plans"
            value={mealPlansLoading ? "..." : String(activeMealPlans)}
            subtitle="Active plans"
            icon={Utensils}
          />
          <StatsCard
            title="Revenue"
            value="₹48.7L"
            subtitle="This month"
            icon={DollarSign}
            trend={{ value: "+8.3%", isPositive: true }}
          />
          <StatsCard
            title="Growth Rate"
            value="18.2%"
            subtitle="Month over month"
            icon={TrendingUp}
            trend={{ value: "+2.1%", isPositive: true }}
          />
        </motion.div>

        {/* Seed Database Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Database className="w-5 h-5" />
                Database Management
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Seed the production database with sample meal plans, nutritionists, and client data
              </p>
            </div>
            <Button
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-full hover-elevate active-elevate-2"
              data-testid="button-seed-database"
            >
              {seedMutation.isPending ? "Seeding..." : "Seed Database"}
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={viewportConfig}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={viewportConfig}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">
                Meal Menu Management
              </h2>
              <Dialog open={mealDialogOpen} onOpenChange={setMealDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary text-primary-foreground rounded-full hover-elevate active-elevate-2" data-testid="button-add-meal">
                    Add Meal
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Meal Plan</DialogTitle>
                    <DialogDescription>
                      Create a new meal plan for your customers
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="meal-name">Meal Plan Title</Label>
                      <Input
                        id="meal-name"
                        placeholder="e.g., Weight Loss Special"
                        value={mealForm.title}
                        onChange={(e) => setMealForm({ ...mealForm, title: e.target.value })}
                        data-testid="input-meal-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="meal-description">Description</Label>
                      <Textarea
                        id="meal-description"
                        placeholder="Describe the meal plan..."
                        value={mealForm.description}
                        onChange={(e) => setMealForm({ ...mealForm, description: e.target.value })}
                        data-testid="input-meal-description"
                      />
                    </div>
                    <div>
                      <Label htmlFor="diet-category">Category</Label>
                      <Select value={mealForm.category} onValueChange={(value) => setMealForm({ ...mealForm, category: value })}>
                        <SelectTrigger id="diet-category" data-testid="select-diet-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weight_management">Weight Management</SelectItem>
                          <SelectItem value="fitness">Fitness</SelectItem>
                          <SelectItem value="health">Health</SelectItem>
                          <SelectItem value="dietary_preference">Dietary Preference</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="price">Price (₹)</Label>
                      <Input
                        id="price"
                        type="number"
                        placeholder="15000"
                        value={mealForm.currentPrice}
                        onChange={(e) => setMealForm({ ...mealForm, currentPrice: e.target.value })}
                        data-testid="input-price"
                      />
                    </div>
                    <div>
                      <Label htmlFor="features">Features (comma-separated)</Label>
                      <Input
                        id="features"
                        placeholder="e.g., Low calorie, High fiber, Portion controlled"
                        value={mealForm.features}
                        onChange={(e) => setMealForm({ ...mealForm, features: e.target.value })}
                        data-testid="input-features"
                      />
                    </div>
                    <Button 
                      onClick={handleMealSubmit} 
                      disabled={createMealMutation.isPending}
                      className="w-full bg-primary text-primary-foreground rounded-full hover-elevate active-elevate-2" 
                      data-testid="button-save-meal"
                    >
                      {createMealMutation.isPending ? "Saving..." : "Save Meal Plan"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {mealPlansLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 border border-border rounded-lg animate-pulse">
                    <div className="h-4 bg-muted rounded mb-2 w-1/2"></div>
                    <div className="h-3 bg-muted rounded w-1/3"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(Array.isArray(mealPlansData) ? mealPlansData : []).slice(0, 5).map((plan: any) => (
                  <div key={plan.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <p className="font-semibold text-foreground">{plan.title}</p>
                      <p className="text-sm text-muted-foreground">₹{(plan.currentPrice || 0).toLocaleString()}/month</p>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-full" data-testid={`button-edit-meal-${plan.id}`}>
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={viewportConfig}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <h2 className="text-xl font-bold text-foreground mb-6">
              Recent Orders
            </h2>
            {ordersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 border border-border rounded-lg animate-pulse">
                    <div className="h-4 bg-muted rounded mb-2 w-1/2"></div>
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No recent orders
              </p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <p className="font-semibold text-foreground">{order.clientName}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.dietPlan} - {order.mealType}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">₹{(order.price || 0).toLocaleString()}</p>
                      <span className={`text-xs ${order.status === 'delivered' ? 'text-success' : 'text-warning'}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.section>
        </motion.div>

        {/* User Management Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={viewportConfig}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={viewportConfig}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">
                Nutritionist Management
              </h2>
              <Dialog open={nutritionistDialogOpen} onOpenChange={setNutritionistDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary text-primary-foreground rounded-full hover-elevate active-elevate-2" data-testid="button-add-nutritionist">
                    Add Nutritionist
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Nutritionist</DialogTitle>
                    <DialogDescription>
                      Add a nutritionist to your team
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="nutritionist-name">Name</Label>
                      <Input
                        id="nutritionist-name"
                        placeholder="e.g., Dr. Priya Sharma"
                        value={nutritionistForm.name}
                        onChange={(e) => setNutritionistForm({ ...nutritionistForm, name: e.target.value })}
                        data-testid="input-nutritionist-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nutritionist-email">Email</Label>
                      <Input
                        id="nutritionist-email"
                        type="email"
                        placeholder="priya@zyael.com"
                        value={nutritionistForm.email}
                        onChange={(e) => setNutritionistForm({ ...nutritionistForm, email: e.target.value })}
                        data-testid="input-nutritionist-email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nutritionist-specialization">Specialization</Label>
                      <Input
                        id="nutritionist-specialization"
                        placeholder="e.g., Weight Management"
                        value={nutritionistForm.specialization}
                        onChange={(e) => setNutritionistForm({ ...nutritionistForm, specialization: e.target.value })}
                        data-testid="input-nutritionist-specialization"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nutritionist-experience">Experience (years)</Label>
                      <Input
                        id="nutritionist-experience"
                        type="number"
                        placeholder="10"
                        value={nutritionistForm.experience}
                        onChange={(e) => setNutritionistForm({ ...nutritionistForm, experience: e.target.value })}
                        data-testid="input-nutritionist-experience"
                      />
                    </div>
                    <Button 
                      onClick={handleNutritionistSubmit} 
                      disabled={createNutritionistMutation.isPending}
                      className="w-full bg-primary text-primary-foreground rounded-full hover-elevate active-elevate-2" 
                      data-testid="button-save-nutritionist"
                    >
                      {createNutritionistMutation.isPending ? "Saving..." : "Save Nutritionist"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-muted-foreground text-center py-4">
              {Array.isArray(nutritionistsData) ? `${nutritionistsData.length} nutritionists in your team` : "Loading..."}
            </p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={viewportConfig}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">
                Client Management
              </h2>
              <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary text-primary-foreground rounded-full hover-elevate active-elevate-2" data-testid="button-add-client">
                    Add Client
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Client</DialogTitle>
                    <DialogDescription>
                      Add a new client to the platform
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="client-user-id">User ID</Label>
                      <Input
                        id="client-user-id"
                        placeholder="e.g., user-001"
                        value={clientForm.userId}
                        onChange={(e) => setClientForm({ ...clientForm, userId: e.target.value })}
                        data-testid="input-client-user-id"
                      />
                    </div>
                    <div>
                      <Label htmlFor="client-nutritionist">Nutritionist</Label>
                      <Select value={clientForm.nutritionistId} onValueChange={(value) => setClientForm({ ...clientForm, nutritionistId: value })}>
                        <SelectTrigger id="client-nutritionist" data-testid="select-client-nutritionist">
                          <SelectValue placeholder="Select nutritionist" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(nutritionistsData) && nutritionistsData.map((nutritionist: any) => (
                            <SelectItem key={nutritionist.id} value={nutritionist.id}>
                              {nutritionist.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="client-weight-start">Start Weight (kg)</Label>
                        <Input
                          id="client-weight-start"
                          type="number"
                          placeholder="85"
                          value={clientForm.weightStart}
                          onChange={(e) => setClientForm({ ...clientForm, weightStart: e.target.value })}
                          data-testid="input-client-weight-start"
                        />
                      </div>
                      <div>
                        <Label htmlFor="client-weight-goal">Goal Weight (kg)</Label>
                        <Input
                          id="client-weight-goal"
                          type="number"
                          placeholder="75"
                          value={clientForm.weightGoal}
                          onChange={(e) => setClientForm({ ...clientForm, weightGoal: e.target.value })}
                          data-testid="input-client-weight-goal"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="client-height">Height (cm)</Label>
                        <Input
                          id="client-height"
                          type="number"
                          placeholder="175"
                          value={clientForm.height}
                          onChange={(e) => setClientForm({ ...clientForm, height: e.target.value })}
                          data-testid="input-client-height"
                        />
                      </div>
                      <div>
                        <Label htmlFor="client-age">Age</Label>
                        <Input
                          id="client-age"
                          type="number"
                          placeholder="32"
                          value={clientForm.age}
                          onChange={(e) => setClientForm({ ...clientForm, age: e.target.value })}
                          data-testid="input-client-age"
                        />
                      </div>
                      <div>
                        <Label htmlFor="client-gender">Gender</Label>
                        <Select value={clientForm.gender} onValueChange={(value) => setClientForm({ ...clientForm, gender: value })}>
                          <SelectTrigger id="client-gender" data-testid="select-client-gender">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="client-dietary">Dietary Preferences</Label>
                      <Input
                        id="client-dietary"
                        placeholder="e.g., Vegetarian"
                        value={clientForm.dietaryPreferences}
                        onChange={(e) => setClientForm({ ...clientForm, dietaryPreferences: e.target.value })}
                        data-testid="input-client-dietary"
                      />
                    </div>
                    <Button 
                      onClick={handleClientSubmit} 
                      disabled={createClientMutation.isPending}
                      className="w-full bg-primary text-primary-foreground rounded-full hover-elevate active-elevate-2" 
                      data-testid="button-save-client"
                    >
                      {createClientMutation.isPending ? "Saving..." : "Save Client"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-muted-foreground text-center py-4">
              {totalUsers} clients on the platform
            </p>
          </motion.section>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportConfig}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <h2 className="text-xl font-bold text-foreground mb-6">
            Analytics Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-muted/30 rounded-lg">
              <p className="text-3xl font-bold text-primary mb-2">87%</p>
              <p className="text-sm text-muted-foreground">
                Customer Satisfaction
              </p>
            </div>
            <div className="text-center p-6 bg-muted/30 rounded-lg">
              <p className="text-3xl font-bold text-primary mb-2">4.8</p>
              <p className="text-sm text-muted-foreground">Average Rating</p>
            </div>
            <div className="text-center p-6 bg-muted/30 rounded-lg">
              <p className="text-3xl font-bold text-primary mb-2">94%</p>
              <p className="text-sm text-muted-foreground">Meal Completion</p>
            </div>
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}
