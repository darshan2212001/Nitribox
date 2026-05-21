import { useState } from "react";
import { Package, TrendingUp, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { listItemVariants, pageTransitionVariants } from "@/lib/animations";
import DeliveryOrderCard from "@/components/DeliveryOrderCard";
import StatsCard from "@/components/StatsCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const userImage1 = "/images/generated/Happy_customer_testimonial_photo_4e688e5c.png";
const userImage2 = "/images/generated/Business_professional_customer_testimonial_18fae654.png";

export default function DeliveryPortal() {
  //todo: remove mock functionality
  type OrderStatus = 'pickup' | 'delivering' | 'delivered';
  const [activeTab, setActiveTab] = useState<"pickup" | "delivering" | "completed">("pickup");
  const [orders, setOrders] = useState<Array<{
    id: string;
    userName: string;
    userImage: string;
    address: string;
    phone: string;
    mealType: string;
    status: OrderStatus;
  }>>([
    {
      id: "1",
      userName: "Priya Menon",
      userImage: userImage1,
      address: "Flat 204, Green Park Apartments, Koramangala 5th Block, Bengaluru - 560095",
      phone: "+91 98765 43210",
      mealType: "Breakfast - Weight Loss Plan",
      status: "pickup",
    },
    {
      id: "2",
      userName: "Rohan Sharma",
      userImage: userImage2,
      address: "House No. 12, Brigade Road, MG Road, Bengaluru - 560001",
      phone: "+91 98765 43211",
      mealType: "Lunch - Muscle Gain Plan",
      status: "pickup",
    },
  ]);

  const handleStatusChange = (id: string, newStatus: string) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === id ? { ...order, status: newStatus as any } : order
      )
    );
  };

  const pickupOrders = orders.filter((o) => o.status === "pickup");
  const deliveringOrders = orders.filter((o) => o.status === "delivering");
  const completedOrders = orders.filter((o) => o.status === "delivered");

  return (
    <motion.div
      {...pageTransitionVariants}
      className="min-h-screen bg-background"
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="bg-[#FF8C00] text-white py-8 mb-8"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-2">Delivery Dashboard</h1>
          <p className="text-white/90">Manage your deliveries and routes</p>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <StatsCard
            title="Today's Deliveries"
            value={orders.length.toString()}
            subtitle="Total orders"
            icon={Package}
          />
          <StatsCard
            title="Completed"
            value={completedOrders.length.toString()}
            subtitle={`${pickupOrders.length + deliveringOrders.length} remaining`}
            icon={TrendingUp}
            trend={{
              value: `${Math.round((completedOrders.length / orders.length) * 100)}%`,
              isPositive: true,
            }}
          />
          <StatsCard
            title="Distance Covered"
            value="18.5km"
            subtitle="Today"
            icon={MapPin}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pickup" data-testid="tab-pickup">
              Pickup ({pickupOrders.length})
            </TabsTrigger>
            <TabsTrigger value="delivering" data-testid="tab-delivering">
              Delivering ({deliveringOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed">
              Completed ({completedOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pickup" className="space-y-4 mt-6">
            <AnimatePresence mode="wait">
              {pickupOrders.length > 0 ? (
                pickupOrders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    variants={listItemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    transition={{ delay: index * 0.1 }}
                  >
                    <DeliveryOrderCard
                  key={order.id}
                  {...order}
                      onStatusChange={(newStatus) =>
                        handleStatusChange(order.id, newStatus)
                      }
                    />
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 text-muted-foreground"
                >
                  No orders to pickup
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="delivering" className="space-y-4 mt-6">
            <AnimatePresence mode="wait">
              {deliveringOrders.length > 0 ? (
                deliveringOrders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    variants={listItemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    transition={{ delay: index * 0.1 }}
                  >
                    <DeliveryOrderCard
                      key={order.id}
                      {...order}
                      onStatusChange={(newStatus) =>
                        handleStatusChange(order.id, newStatus)
                      }
                    />
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 text-muted-foreground"
                >
                  No orders in transit
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 mt-6">
            <AnimatePresence mode="wait">
              {completedOrders.length > 0 ? (
                completedOrders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    variants={listItemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    transition={{ delay: index * 0.1 }}
                  >
                    <DeliveryOrderCard
                      key={order.id}
                      {...order}
                      onStatusChange={(newStatus) =>
                        handleStatusChange(order.id, newStatus)
                      }
                    />
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 text-muted-foreground"
                >
                  No completed deliveries today
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>
        </motion.div>
      </div>
    </motion.div>
  );
}
